import { startOfMonth, endOfMonth, subMonths, isAfter, isBefore, isEqual, differenceInCalendarDays, getDaysInMonth, differenceInDays } from 'date-fns';
import { logger } from '../utils/logger.js';

export type PlaidTransaction = { date: string; amount: number };

// Type for processed transactions from Plaid service
export interface ProcessedTransaction {
  id: string;
  amount: number;
  date: Date;
  merchantName: string | null;
  category: string | null;
  accountId: string;
}

export class CalculationService {
  private isWithinInclusive(date: Date, start: Date, end: Date): boolean {
    return (isAfter(date, start) || isEqual(date, start)) && (isBefore(date, end) || isEqual(date, end));
  }

  calculateMonthlySpending(transactions: PlaidTransaction[], targetMonth: Date): number {
    try {
      const monthStart = startOfMonth(targetMonth);
      const monthEnd = endOfMonth(targetMonth);
      let total = 0;
      for (const tx of transactions) {
        const txDate = new Date(tx.date);
        if (Number.isFinite(tx.amount) && tx.amount > 0 && this.isWithinInclusive(txDate, monthStart, monthEnd)) {
          total += tx.amount;
        }
      }
      return Number(total.toFixed(2));
    } catch (err) {
      logger.error('calculateMonthlySpending failed', err);
      throw err;
    }
  }

  calculateDailyAverage(transactions: PlaidTransaction[], targetMonth: Date): number {
    try {
      const monthStart = startOfMonth(targetMonth);
      const monthEnd = endOfMonth(targetMonth);
      const daysInMonth = differenceInCalendarDays(monthEnd, monthStart) + 1;
      const monthlySpent = this.calculateMonthlySpending(transactions, targetMonth);
      return Number((monthlySpent / daysInMonth).toFixed(2));
    } catch (err) {
      logger.error('calculateDailyAverage failed', err);
      throw err;
    }
  }

  generateSpendingReport(transactions: PlaidTransaction[]) {
    const now = new Date();
    const currentMonth = now;
    const lastMonth = subMonths(now, 1);

    const monthlySpent = this.calculateMonthlySpending(transactions, currentMonth);
    const lastMonthSpent = this.calculateMonthlySpending(transactions, lastMonth);
    const averageDaily = this.calculateDailyAverage(transactions, lastMonth);

    return {
      name: process.env.YOUR_NAME || 'Friend',
      dailyLimit: parseFloat(process.env.DAILY_SPENDING_LIMIT || '100'),
      monthlySpent,
      lastMonthSpent,
      averageDaily,
    };
  }

  /**
   * Convert ProcessedTransaction array to PlaidTransaction format
   * @param processedTransactions - Array of processed transactions from Plaid service
   * @returns Array of transactions in PlaidTransaction format
   */
  convertToPlaidTransactions(processedTransactions: ProcessedTransaction[]): PlaidTransaction[] {
    return processedTransactions.map(tx => ({
      date: tx.date.toISOString().split('T')[0], // Convert Date to YYYY-MM-DD string
      amount: tx.amount
    }));
  }

  /**
   * Calculate spending within a custom period from transaction data
   * @param transactions - Array of transactions to filter (PlaidTransaction format)
   * @param periodStart - Start date of the period (inclusive)
   * @param periodEnd - End date of the period (inclusive)
   * @returns Total spending amount within the period
   */
  calculatePeriodSpending(transactions: PlaidTransaction[], periodStart: Date, periodEnd: Date): number {
    try {
      let total = 0;
      
      for (const tx of transactions) {
        const txDate = new Date(tx.date);
        
        // Check if transaction is within the period (inclusive)
        if (Number.isFinite(tx.amount) && 
            tx.amount > 0 && 
            this.isWithinInclusive(txDate, periodStart, periodEnd)) {
          total += tx.amount;
        }
      }
      
      return Number(total.toFixed(2));
    } catch (err) {
      logger.error('calculatePeriodSpending failed', { err, periodStart, periodEnd });
      return 0; // Graceful fallback
    }
  }

  /**
   * Calculate daily spending target based on period budget and actual spending
   * Formula: (Period budget - Current period spending) / Days remaining in period
   * @param periodBudget - Total budget for the period
   * @param currentPeriodSpending - Amount spent so far in the period
   * @param periodStart - Start date of the period
   * @param periodEnd - End date of the period  
   * @param today - Current date (defaults to today)
   */
  calculatePeriodAwareDailyTarget(
    periodBudget: number, 
    currentPeriodSpending: number, 
    periodStart: Date,
    periodEnd: Date,
    today: Date = new Date()
  ): number {
    try {
      // Validate inputs
      if (!Number.isFinite(periodBudget) || 
          !Number.isFinite(currentPeriodSpending) || 
          periodBudget < 0) {
        logger.warn('Invalid inputs for period daily target calculation', { 
          periodBudget, 
          currentPeriodSpending,
          periodStart,
          periodEnd 
        });
        return 0;
      }

      // Calculate days remaining in period (including today)
      const daysRemaining = differenceInDays(periodEnd, today) + 1;
      
      // If no days remaining or period has ended, return 0
      if (daysRemaining <= 0) {
        logger.info('Period has ended or no days remaining', { 
          periodEnd, 
          today, 
          daysRemaining 
        });
        return 0;
      }

      const remainingBudget = periodBudget - currentPeriodSpending;
      
      // If budget is exceeded, return 0
      if (remainingBudget <= 0) {
        logger.info('Period budget exceeded', { 
          periodBudget, 
          currentPeriodSpending, 
          remainingBudget 
        });
        return 0;
      }

      // Calculate and floor to whole dollars
      const dailyTarget = Math.floor(remainingBudget / daysRemaining);
      
      return Math.max(0, dailyTarget); // Ensure non-negative
    } catch (err) {
      logger.error('calculatePeriodAwareDailyTarget failed', { 
        err, 
        periodBudget, 
        currentPeriodSpending,
        periodStart,
        periodEnd,
        today 
      });
      return 0; // Graceful fallback
    }
  }

  /**
   * DEPRECATED: Calculate daily spending target based on remaining budget and days in month
   * Use calculatePeriodAwareDailyTarget for period-aware calculations
   * Formula: (Monthly budget - Current month spending) / Days remaining in month
   */
  calculateDailyTarget(monthlyBudget: number, currentMonthSpending: number, today: Date = new Date()): number {
    try {
      // Validate inputs
      if (!Number.isFinite(monthlyBudget) || !Number.isFinite(currentMonthSpending) || monthlyBudget < 0) {
        logger.warn('Invalid inputs for daily target calculation', { monthlyBudget, currentMonthSpending });
        return 0;
      }

      // Calculate days remaining in month including today
      const dayOfMonth = today.getDate();
      const totalDaysInMonth = getDaysInMonth(today);
      const daysRemaining = totalDaysInMonth - dayOfMonth + 1; // +1 to include today
      
      // If no days remaining or negative days, return 0
      if (daysRemaining <= 0) {
        return 0;
      }

      const remainingBudget = monthlyBudget - currentMonthSpending;
      
      // If budget is exceeded, return 0
      if (remainingBudget <= 0) {
        return 0;
      }

      // Calculate and floor to whole dollars
      const dailyTarget = Math.floor(remainingBudget / daysRemaining);
      
      return Math.max(0, dailyTarget); // Ensure non-negative
    } catch (err) {
      logger.error('calculateDailyTarget failed', { err, monthlyBudget, currentMonthSpending, today });
      return 0; // Graceful fallback
    }
  }

  /**
   * Format daily target as currency string
   */
  formatDailyTargetMessage(target: number): string {
    try {
      const amount = Math.max(0, Math.floor(target)); // Ensure non-negative whole number
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch (err) {
      logger.error('formatDailyTargetMessage failed', { err, target });
      return '$0'; // Graceful fallback
    }
  }
}

