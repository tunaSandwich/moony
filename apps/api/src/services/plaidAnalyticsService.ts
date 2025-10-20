import { PlaidApi, Configuration, PlaidEnvironments, Transaction } from 'plaid';
import { prisma } from '../db.js';
import { logger } from '@logger';
import { decrypt, validateEncryptionKey } from '../utils/encryption.js';
import { 
  SpendingMetrics, 
  ProcessedTransaction, 
  MonthlySpending,
  AnalyticsProcessingOptions,
  ANALYTICS_CONSTANTS,
  AnalyticsError
} from '../types/analytics.js';
import { startOfMonth, endOfMonth, subMonths, format, parseISO } from 'date-fns';

export class PlaidAnalyticsService {
  private plaidClient: PlaidApi;
  private prisma = prisma;

  constructor() {
    // Initialize Plaid client
    const configuration = new Configuration({
      basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
          'PLAID-SECRET': process.env.PLAID_SECRET,
        },
      },
    });
    this.plaidClient = new PlaidApi(configuration);
  }

  /**
   * Main entry point for processing user analytics
   * Includes retry logic and error handling
   */
  public async processUserAnalytics(
    userId: string, 
    options: AnalyticsProcessingOptions = {}
  ): Promise<void> {
    const { retryCount = 0, maxRetries = ANALYTICS_CONSTANTS.MAX_RETRY_ATTEMPTS } = options;
    
    try {
      logger.info('Starting analytics processing', { userId, attempt: retryCount + 1 });

      // Get user's encrypted access token
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { plaidAccessToken: true, firstName: true, lastName: true }
      });

      if (!user || !user.plaidAccessToken) {
        throw new Error('User not found or no Plaid access token available');
      }

      // Decrypt access token
      const accessToken = await this.decryptAccessToken(user.plaidAccessToken);

      // Fetch transaction history
      const transactions = await this.fetchTransactionHistory(accessToken, options);

      // Calculate spending metrics
      const metrics = await this.calculateSpendingMetrics(transactions);

      // Store analytics in database
      await this.storeAnalytics(userId, metrics);

      logger.info('Analytics processing completed successfully', { 
        userId, 
        transactionCount: transactions.length,
        averageMonthlySpending: metrics.averageMonthlySpending,
        lastMonthSpending: metrics.lastMonthSpending,
        currentMonthSpending: metrics.currentMonthSpending
      });

    } catch (error: any) {
      await this.handleAnalyticsError(userId, error, retryCount, maxRetries, options);
    }
  }

  /**
   * Fetch 6 months of transaction history from Plaid
   */
  public async fetchTransactionHistory(
    accessToken: string, 
    options: AnalyticsProcessingOptions = {}
  ): Promise<ProcessedTransaction[]> {
    const { daysRequested = ANALYTICS_CONSTANTS.DEFAULT_DAYS_REQUESTED } = options;
    
    try {
      // Calculate date range (6 months back)
      const endDate = new Date();
      const startDate = subMonths(endDate, 6);

      logger.info('Fetching transaction history', { 
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        daysRequested
      });

      const response = await this.plaidClient.transactionsGet({
        access_token: accessToken,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        options: {
          count: 500, // Maximum per request
          offset: 0,
        }
      });

      let allTransactions = response.data.transactions;
      const totalTransactions = response.data.total_transactions;

      // Handle pagination if there are more transactions
      while (allTransactions.length < totalTransactions) {
        const nextResponse = await this.plaidClient.transactionsGet({
          access_token: accessToken,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          options: {
            count: 500,
            offset: allTransactions.length,
          }
        });
        allTransactions = allTransactions.concat(nextResponse.data.transactions);
      }

      // Process and filter transactions
      const processedTransactions = this.processTransactions(allTransactions);

      // Calculate total amount for debug logging
      const totalAmount = allTransactions.reduce((sum, t) => sum + t.amount, 0);

      logger.info('Transaction fetch completed', { 
        totalFetched: allTransactions.length,
        spendingTransactions: processedTransactions.length
      });


      // Log transaction date distribution to see if we're missing months
      const transactionsByMonth = new Map<string, number>();
      const amountsByMonth = new Map<string, number>();
      
      allTransactions.forEach(transaction => {
        const monthKey = transaction.date.substring(0, 7); // YYYY-MM format
        transactionsByMonth.set(monthKey, (transactionsByMonth.get(monthKey) || 0) + 1);
        amountsByMonth.set(monthKey, (amountsByMonth.get(monthKey) || 0) + transaction.amount);
      });

      // Sort months and display distribution
      const sortedMonths = Array.from(transactionsByMonth.keys()).sort();

      sortedMonths.forEach(month => {
        const count = transactionsByMonth.get(month) || 0;
        const amount = Math.abs(amountsByMonth.get(month) || 0);
        console.log(`[PLAID DEBUG]   ${month}: ${count} transactions, $${amount.toFixed(2)}`);
      });

      // Show sample raw transactions for Lucas to analyze
      const sampleTransactions = allTransactions
        .filter(t => t.date.startsWith('2025-08') || t.date.startsWith('2025-09'))
        .slice(0, 10);
      
      sampleTransactions.forEach(t => {
        console.log(`[PLAID DEBUG]   ${t.date} | $${t.amount} | ${t.name || 'No name'} | ${t.category?.[0] || 'No category'} | ${t.merchant_name || 'No merchant'}`);
      });

      // Log what gets filtered out during processing
      const filteredOutCount = allTransactions.length - processedTransactions.length;

      return processedTransactions;

    } catch (error: any) {
      logger.error('Failed to fetch transaction history', { error: error.message });
      throw new Error(`Transaction fetch failed: ${error.message}`);
    }
  }

  /**
   * Calculate spending metrics from transactions
   */
  public async calculateSpendingMetrics(transactions: ProcessedTransaction[]): Promise<SpendingMetrics> {
    logger.info('Calculating spending metrics', { transactionCount: transactions.length });

    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
    const sixMonthsAgo = subMonths(now, 6);

    // Filter transactions by time periods
    const currentMonthTransactions = transactions.filter(t => 
      t.date >= currentMonthStart && t.date <= now
    );

    const lastMonthTransactions = transactions.filter(t => 
      t.date >= lastMonthStart && t.date <= lastMonthEnd
    );

    const sixMonthTransactions = transactions.filter(t => 
      t.date >= sixMonthsAgo
    );

    // Debug log for date filtering
    console.log(`[PLAID DEBUG] Date filtering - 6 months ago: ${format(sixMonthsAgo, 'yyyy-MM-dd')} | Current: ${format(now, 'yyyy-MM-dd')} | Total transactions: ${transactions.length} | Six-month transactions: ${sixMonthTransactions.length}`);

    // Calculate totals
    const currentMonthSpending = this.sumTransactions(currentMonthTransactions);
    const lastMonthSpending = this.sumTransactions(lastMonthTransactions);

    // DETAILED DEBUG: Show step-by-step calculation verification
    console.log(`[PLAID DEBUG] === STEP-BY-STEP CALCULATION VERIFICATION ===`);
    console.log(`[PLAID DEBUG] Current month calculation - Date range: ${format(currentMonthStart, 'yyyy-MM-dd')} to ${format(now, 'yyyy-MM-dd')} | Transactions: ${currentMonthTransactions.length} | Total: $${currentMonthSpending.toFixed(2)}`);
    console.log(`[PLAID DEBUG] Last month calculation - Date range: ${format(lastMonthStart, 'yyyy-MM-dd')} to ${format(lastMonthEnd, 'yyyy-MM-dd')} | Transactions: ${lastMonthTransactions.length} | Total: $${lastMonthSpending.toFixed(2)}`);
    console.log(`[PLAID DEBUG] Six-month total: $${this.sumTransactions(sixMonthTransactions).toFixed(2)}`);
    
    // ENHANCED VERIFICATION: Manually verify sumTransactions method for last month
    if (lastMonthTransactions.length > 0) {
      console.log(`[PLAID DEBUG] === MANUAL VERIFICATION OF sumTransactions ===`);
      
      // Method 1: Using our sumTransactions method
      const sumMethodResult = this.sumTransactions(lastMonthTransactions);
      console.log(`[PLAID DEBUG] sumTransactions method result: $${sumMethodResult.toFixed(2)}`);
      
      // Method 2: Manual reduce to verify
      const manualSum = lastMonthTransactions.reduce((sum, t) => sum + t.amount, 0);
      console.log(`[PLAID DEBUG] Manual reduce result: $${manualSum.toFixed(2)}`);
      
      // Method 3: Loop-based sum for complete verification
      let loopSum = 0;
      lastMonthTransactions.forEach(t => {
        loopSum += t.amount;
      });
      console.log(`[PLAID DEBUG] Loop-based sum result: $${loopSum.toFixed(2)}`);
      
      // Verify all methods match
      const allMethodsMatch = (sumMethodResult === manualSum) && (manualSum === loopSum);
      console.log(`[PLAID DEBUG] All calculation methods match: ${allMethodsMatch}`);
      
      if (!allMethodsMatch) {
        console.log(`[PLAID DEBUG] ⚠️ CALCULATION MISMATCH DETECTED!`);
        console.log(`[PLAID DEBUG]   sumTransactions: $${sumMethodResult.toFixed(2)}`);
        console.log(`[PLAID DEBUG]   manual reduce: $${manualSum.toFixed(2)}`);
        console.log(`[PLAID DEBUG]   loop sum: $${loopSum.toFixed(2)}`);
      }
    }
    
    // Show sample transactions from each period for verification
    if (currentMonthTransactions.length > 0) {
      console.log(`[PLAID DEBUG] Sample current month transactions (first 5):`);
      currentMonthTransactions.slice(0, 5).forEach(t => {
        console.log(`[PLAID DEBUG]   ${format(t.date, 'yyyy-MM-dd')} | $${t.amount} | ${t.merchantName || 'No merchant'}`);
      });
    }
    
    if (lastMonthTransactions.length > 0) {
      console.log(`[PLAID DEBUG] Sample last month transactions (first 5):`);
      lastMonthTransactions.slice(0, 5).forEach(t => {
        console.log(`[PLAID DEBUG]   ${format(t.date, 'yyyy-MM-dd')} | $${t.amount} | ${t.merchantName || 'No merchant'}`);
      });

      // Complete transaction amount verification for last month (limit to 20 to avoid spam)
      console.log(`[PLAID DEBUG] Complete amount verification for last month (first 20 transactions):`);
      let runningSum = 0;
      let totalTransactionsShown = Math.min(20, lastMonthTransactions.length);
      
      for (let i = 0; i < totalTransactionsShown; i++) {
        const t = lastMonthTransactions[i];
        runningSum += t.amount;
        console.log(`[PLAID DEBUG]   ${i+1}. ${format(t.date, 'yyyy-MM-dd')} | $${t.amount.toFixed(2)} | Running sum: $${runningSum.toFixed(2)} | ${t.merchantName || 'No merchant'}`);
      }
      
      if (lastMonthTransactions.length > 20) {
        console.log(`[PLAID DEBUG]   ... and ${lastMonthTransactions.length - 20} more transactions`);
      }
      
      console.log(`[PLAID DEBUG] Running sum for first ${totalTransactionsShown} transactions: $${runningSum.toFixed(2)}`);
      console.log(`[PLAID DEBUG] Total from sumTransactions for ALL ${lastMonthTransactions.length} transactions: $${lastMonthSpending.toFixed(2)}`);
    }
    console.log(`[PLAID DEBUG] === END VERIFICATION ===`);

    // Calculate spending metrics excluding current month
    console.log(`[PLAID DEBUG] === IMPROVED ANALYTICS CALCULATION ===`);
    
    // Filter out current month transactions for historical analysis
    // Note: currentMonthStart already defined above
    const historicalTransactions = sixMonthTransactions.filter(t => t.date < currentMonthStart);
    
    console.log(`[PLAID DEBUG] Filtering out current month (${format(currentMonthStart, 'yyyy-MM')})`);
    console.log(`[PLAID DEBUG] Historical transactions: ${historicalTransactions.length} (excluding current month)`);
    
    const monthlyTotals = this.groupTransactionsByMonth(historicalTransactions);
    
    // Sort months by date (most recent first)
    const sortedMonths = monthlyTotals.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
    
    console.log(`[PLAID DEBUG] Sorted complete months (most recent first):`);
    sortedMonths.forEach((month, index) => {
      console.log(`[PLAID DEBUG]   ${index + 1}. ${month.year}-${month.month.toString().padStart(2, '0')}: $${month.totalSpending.toFixed(2)}`);
    });

    // Calculate twoMonthsAgoSpending based on available data
    let twoMonthsAgoSpending: number | null = null;
    
    if (sortedMonths.length >= 1) {
      // Edge case logic
      if (sortedMonths.length === 1) {
        twoMonthsAgoSpending = null; // Not enough data
        console.log(`[PLAID DEBUG] Only 1 complete month available - twoMonthsAgoSpending = null`);
      } else if (sortedMonths.length === 2) {
        twoMonthsAgoSpending = sortedMonths[1].totalSpending; // Oldest month
        console.log(`[PLAID DEBUG] 2 complete months - twoMonthsAgoSpending = oldest month: $${twoMonthsAgoSpending.toFixed(2)}`);
      } else {
        twoMonthsAgoSpending = sortedMonths[2].totalSpending; // 3rd most recent
        console.log(`[PLAID DEBUG] 3+ complete months - twoMonthsAgoSpending = 3rd most recent: $${twoMonthsAgoSpending.toFixed(2)}`);
      }
    }

    // Calculate median-based average for complete months
    let averageMonthlySpending = 0;
    
    if (sortedMonths.length > 0) {
      const spendingAmounts = sortedMonths.map(m => m.totalSpending).sort((a, b) => a - b);
      
      if (spendingAmounts.length === 1) {
        averageMonthlySpending = spendingAmounts[0];
        console.log(`[PLAID DEBUG] Single month - using that value: $${averageMonthlySpending.toFixed(2)}`);
      } else {
        // Calculate median
        const midIndex = Math.floor(spendingAmounts.length / 2);
        if (spendingAmounts.length % 2 === 0) {
          // Even number of months - average of two middle values
          averageMonthlySpending = (spendingAmounts[midIndex - 1] + spendingAmounts[midIndex]) / 2;
          console.log(`[PLAID DEBUG] Median of ${spendingAmounts.length} months: ($${spendingAmounts[midIndex - 1].toFixed(2)} + $${spendingAmounts[midIndex].toFixed(2)}) / 2 = $${averageMonthlySpending.toFixed(2)}`);
        } else {
          // Odd number of months - middle value
          averageMonthlySpending = spendingAmounts[midIndex];
          console.log(`[PLAID DEBUG] Median of ${spendingAmounts.length} months: $${averageMonthlySpending.toFixed(2)}`);
        }
      }
    }

    console.log(`[PLAID DEBUG] Final results:`);
    console.log(`[PLAID DEBUG]   averageMonthlySpending (median): $${averageMonthlySpending.toFixed(2)}`);
    console.log(`[PLAID DEBUG]   twoMonthsAgoSpending: ${twoMonthsAgoSpending ? '$' + twoMonthsAgoSpending.toFixed(2) : 'null'}`);
    console.log(`[PLAID DEBUG] === END IMPROVED ANALYTICS CALCULATION ===`);

    const metrics: SpendingMetrics = {
      averageMonthlySpending: Number(averageMonthlySpending.toFixed(2)),
      lastMonthSpending: Number(lastMonthSpending.toFixed(2)),
      twoMonthsAgoSpending: twoMonthsAgoSpending ? Number(twoMonthsAgoSpending.toFixed(2)) : null,
      currentMonthSpending: Number(currentMonthSpending.toFixed(2)),
      lastCalculatedAt: new Date()
    };

    logger.info('Spending metrics calculated', metrics);

    return metrics;
  }

  /**
   * Store analytics results in database
   */
  public async storeAnalytics(userId: string, metrics: SpendingMetrics): Promise<void> {
    try {
      logger.info('Storing analytics in database', { userId });

      await this.prisma.userSpendingAnalytics.upsert({
        where: { userId },
        update: {
          averageMonthlySpending: metrics.averageMonthlySpending,
          lastMonthSpending: metrics.lastMonthSpending,
          twoMonthsAgoSpending: metrics.twoMonthsAgoSpending,
          currentMonthSpending: metrics.currentMonthSpending,
          lastCalculatedAt: metrics.lastCalculatedAt,
          updatedAt: new Date()
        },
        create: {
          userId,
          averageMonthlySpending: metrics.averageMonthlySpending,
          lastMonthSpending: metrics.lastMonthSpending,
          twoMonthsAgoSpending: metrics.twoMonthsAgoSpending,
          currentMonthSpending: metrics.currentMonthSpending,
          lastCalculatedAt: metrics.lastCalculatedAt
        }
      });

      logger.info('Analytics stored successfully', { userId });

    } catch (error: any) {
      logger.error('Failed to store analytics', { userId, error: error.message });
      throw new Error(`Database storage failed: ${error.message}`);
    }
  }

  /**
   * Handle errors with retry logic
   */
  private async handleAnalyticsError(
    userId: string,
    error: any,
    retryCount: number,
    maxRetries: number,
    options: AnalyticsProcessingOptions
  ): Promise<void> {
    const analyticsError: AnalyticsError = {
      userId,
      error: error.message,
      errorType: error.name || 'Unknown',
      attempt: retryCount + 1,
      timestamp: new Date()
    };

    logger.error('Analytics processing failed', analyticsError);

    // Check if we should retry
    if (retryCount < maxRetries && this.shouldRetry(error)) {
      const delay = ANALYTICS_CONSTANTS.RETRY_DELAYS[retryCount] || 4000;
      
      logger.info('Retrying analytics processing', { 
        userId, 
        nextAttempt: retryCount + 2,
        delayMs: delay 
      });

      // Schedule retry with delay
      setTimeout(() => {
        this.processUserAnalytics(userId, { 
          ...options, 
          retryCount: retryCount + 1,
          maxRetries 
        });
      }, delay);
    } else {
      logger.error('Analytics processing failed permanently', { 
        userId,
        totalAttempts: retryCount + 1,
        finalError: error.message
      });
    }
  }

  /**
   * Determine if an error is retryable
   */
  private shouldRetry(error: any): boolean {
    // Don't retry for these conditions
    const nonRetryableErrors = [
      'User not found',
      'no Plaid access token',
      'Invalid access token',
      'INVALID_ACCESS_TOKEN'
    ];

    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.error_code || '';

    // Don't retry if it's a permanent error
    if (nonRetryableErrors.some(nonRetryable => 
      errorMessage.includes(nonRetryable.toLowerCase()) || 
      errorCode === nonRetryable
    )) {
      return false;
    }

    // Retry for network errors, temporary Plaid errors, etc.
    return true;
  }

  /**
   * Decrypt the stored access token
   */
  private async decryptAccessToken(encryptedToken: string): Promise<string> {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey || !validateEncryptionKey(encryptionKey)) {
      throw new Error('Invalid encryption configuration');
    }

    try {
      return decrypt(encryptedToken, encryptionKey);
    } catch (error) {
      throw new Error('Failed to decrypt access token');
    }
  }

  /**
   * Process raw Plaid transactions into our format
   * Filter to spending transactions only
   */
  private processTransactions(transactions: Transaction[]): ProcessedTransaction[] {
    const filteredOut = {
      negative: 0,
      belowThreshold: 0,
      excludedCategory: 0,
      excluded: [] as any[]
    };

    const result = transactions
      .filter(transaction => {
        // Track what gets filtered out
        if (transaction.amount <= 0) {
          filteredOut.negative++;
          return false;
        }
        if (transaction.amount <= ANALYTICS_CONSTANTS.SPENDING_TRANSACTION_THRESHOLD) {
          filteredOut.belowThreshold++;
          return false;
        }
        if (this.isExcludedCategory(transaction.category)) {
          filteredOut.excludedCategory++;
          filteredOut.excluded.push({
            date: transaction.date,
            amount: transaction.amount,
            category: transaction.category?.[0],
            merchant: transaction.merchant_name
          });
          return false;
        }
        return true;
      })
      .map(transaction => ({
        id: transaction.transaction_id,
        amount: transaction.amount,
        date: parseISO(transaction.date),
        merchantName: transaction.merchant_name || null,
        category: transaction.category?.[0] || null,
        accountId: transaction.account_id
      }));

    // Log what was filtered out
    console.log(`[PLAID DEBUG] Transaction filtering results:`);
    console.log(`[PLAID DEBUG]   Negative amounts (income/credits): ${filteredOut.negative}`);
    console.log(`[PLAID DEBUG]   Below threshold ($${ANALYTICS_CONSTANTS.SPENDING_TRANSACTION_THRESHOLD}): ${filteredOut.belowThreshold}`);
    console.log(`[PLAID DEBUG]   Excluded categories: ${filteredOut.excludedCategory}`);
    if (filteredOut.excluded.length > 0) {
      console.log(`[PLAID DEBUG]   Sample excluded transactions:`);
      filteredOut.excluded.slice(0, 5).forEach(t => {
        console.log(`[PLAID DEBUG]     ${t.date}: $${t.amount} - ${t.category} (${t.merchant || 'No merchant'})`);
      });
    }

    return result;
  }

  /**
   * Check if transaction category should be excluded from spending calculations
   */
  private isExcludedCategory(categories: string[] | null): boolean {
    if (!categories || categories.length === 0) return false;

    const excludedCategories = [
      'Transfer',
      'Deposit',
      'Credit Card Payment',
      'Payroll'
    ];

    return excludedCategories.some(excluded => 
      categories.some(category => category.includes(excluded))
    );
  }

  /**
   * Sum transaction amounts
   */
  private sumTransactions(transactions: ProcessedTransaction[]): number {
    return transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  }

  /**
   * Group transactions by month for averaging
   */
  private groupTransactionsByMonth(transactions: ProcessedTransaction[]): MonthlySpending[] {
    console.log(`[PLAID DEBUG] === groupTransactionsByMonth DEBUG ===`);
    console.log(`[PLAID DEBUG] Input transactions count: ${transactions.length}`);
    
    const monthlyGroups = new Map<string, ProcessedTransaction[]>();

    // Debug: Show date range of input transactions
    if (transactions.length > 0) {
      const dates = transactions.map(t => t.date).sort((a, b) => a.getTime() - b.getTime());
      const firstDate = format(dates[0], 'yyyy-MM-dd');
      const lastDate = format(dates[dates.length - 1], 'yyyy-MM-dd');
      console.log(`[PLAID DEBUG] Transaction date range: ${firstDate} to ${lastDate}`);
    }

    transactions.forEach(transaction => {
      const monthKey = format(transaction.date, 'yyyy-MM');
      if (!monthlyGroups.has(monthKey)) {
        monthlyGroups.set(monthKey, []);
      }
      monthlyGroups.get(monthKey)!.push(transaction);
    });

    // Debug: Show all unique months found
    const sortedMonthKeys = Array.from(monthlyGroups.keys()).sort();
    console.log(`[PLAID DEBUG] Unique months found: ${sortedMonthKeys.length}`);
    console.log(`[PLAID DEBUG] Month keys: [${sortedMonthKeys.join(', ')}]`);

    const result = Array.from(monthlyGroups.entries()).map(([monthKey, monthTransactions]) => {
      const [year, month] = monthKey.split('-').map(Number);
      const totalSpending = this.sumTransactions(monthTransactions);
      
      // Debug: Show details for each month
      console.log(`[PLAID DEBUG] Month ${monthKey}: ${monthTransactions.length} transactions, $${totalSpending.toFixed(2)}`);
      
      return {
        year,
        month,
        totalSpending,
        transactionCount: monthTransactions.length
      };
    });

    console.log(`[PLAID DEBUG] Final monthlyTotals.length: ${result.length}`);
    console.log(`[PLAID DEBUG] === END groupTransactionsByMonth DEBUG ===`);

    return result;
  }

  /**
   * Fetch transactions for a specific period for daily spending calculations
   * @param userId - User ID to fetch transactions for
   * @param periodStart - Start date of the period (inclusive)
   * @param periodEnd - End date of the period (inclusive, but limited to today)
   * @returns Array of processed transactions within the period
   */
  public async fetchPeriodTransactions(
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<{ transactions: ProcessedTransaction[], error?: string }> {
    try {
      logger.info('Fetching period transactions', { 
        userId, 
        periodStart: format(periodStart, 'yyyy-MM-dd'),
        periodEnd: format(periodEnd, 'yyyy-MM-dd')
      });

      // Get user's encrypted access token
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { plaidAccessToken: true }
      });

      if (!user || !user.plaidAccessToken) {
        const error = 'User not found or no Plaid access token available';
        logger.warn(error, { userId });
        return { transactions: [], error };
      }

      // Decrypt access token
      const accessToken = await this.decryptAccessToken(user.plaidAccessToken);

      // Limit end date to today to avoid future dates
      const today = new Date();
      const effectiveEndDate = periodEnd > today ? today : periodEnd;

      // Fetch transactions for the period
      const response = await this.plaidClient.transactionsGet({
        access_token: accessToken,
        start_date: format(periodStart, 'yyyy-MM-dd'),
        end_date: format(effectiveEndDate, 'yyyy-MM-dd'),
        options: {
          count: 500, // Maximum per request
          offset: 0,
        }
      });

      let allTransactions = response.data.transactions;
      const totalTransactions = response.data.total_transactions;

      // Handle pagination if there are more transactions
      while (allTransactions.length < totalTransactions) {
        const nextResponse = await this.plaidClient.transactionsGet({
          access_token: accessToken,
          start_date: format(periodStart, 'yyyy-MM-dd'),
          end_date: format(effectiveEndDate, 'yyyy-MM-dd'),
          options: {
            count: 500,
            offset: allTransactions.length,
          }
        });
        allTransactions = allTransactions.concat(nextResponse.data.transactions);
      }

      // Process and filter transactions
      const processedTransactions = this.processTransactions(allTransactions);

      logger.info('Period transactions fetched successfully', { 
        userId,
        totalFetched: allTransactions.length,
        spendingTransactions: processedTransactions.length,
        periodStart: format(periodStart, 'yyyy-MM-dd'),
        periodEnd: format(effectiveEndDate, 'yyyy-MM-dd')
      });

      return { transactions: processedTransactions };

    } catch (error: any) {
      const errorMessage = `Failed to fetch period transactions: ${error.message}`;
      logger.error(errorMessage, { 
        userId, 
        periodStart, 
        periodEnd,
        error: error.message 
      });
      
      // Return empty transactions array with error for graceful degradation
      return { transactions: [], error: errorMessage };
    }
  }

  /**
   * Cleanup method for closing connections
   */
  public async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
