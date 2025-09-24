import { startOfMonth, endOfMonth, subMonths, isAfter, isBefore, isEqual, differenceInCalendarDays, getDaysInMonth } from 'date-fns';
import { logger } from '../utils/logger.js';

export type PlaidTransaction = { date: string; amount: number };

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
   * Calculate daily spending target based on remaining budget and days in month
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

