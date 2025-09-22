import { PlaidApi, Configuration, PlaidEnvironments, Transaction } from 'plaid';
import { PrismaClient } from '@prisma/client';
import { logger } from '@logger';
import { decrypt, validateEncryptionKey } from '../utils/encryption.js';
import { 
  SpendingMetrics, 
  ProcessedTransaction, 
  MonthlySpending,
  AnalyticsProcessingOptions,
  TransactionSyncResult,
  ANALYTICS_CONSTANTS,
  AnalyticsError
} from '../types/analytics.js';
import { startOfMonth, endOfMonth, subMonths, format, parseISO } from 'date-fns';

export class PlaidAnalyticsService {
  private plaidClient: PlaidApi;
  private prisma: PrismaClient;

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
    this.prisma = new PrismaClient();
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

      logger.info('Transaction fetch completed', { 
        totalFetched: allTransactions.length,
        spendingTransactions: processedTransactions.length
      });

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

    // Calculate totals
    const currentMonthSpending = this.sumTransactions(currentMonthTransactions);
    const lastMonthSpending = this.sumTransactions(lastMonthTransactions);

    // Calculate average monthly spending over 6 months
    const monthlyTotals = this.groupTransactionsByMonth(sixMonthTransactions);
    const averageMonthlySpending = monthlyTotals.length > 0 
      ? monthlyTotals.reduce((sum, month) => sum + month.totalSpending, 0) / monthlyTotals.length
      : 0;

    const metrics: SpendingMetrics = {
      averageMonthlySpending: Number(averageMonthlySpending.toFixed(2)),
      lastMonthSpending: Number(lastMonthSpending.toFixed(2)),
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
          currentMonthSpending: metrics.currentMonthSpending,
          lastCalculatedAt: metrics.lastCalculatedAt,
          updatedAt: new Date()
        },
        create: {
          userId,
          averageMonthlySpending: metrics.averageMonthlySpending,
          lastMonthSpending: metrics.lastMonthSpending,
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
    return transactions
      .filter(transaction => {
        // Include only spending transactions (positive amounts in Plaid)
        // and exclude transfers, payments to credit cards, etc.
        return transaction.amount > ANALYTICS_CONSTANTS.SPENDING_TRANSACTION_THRESHOLD &&
               !this.isExcludedCategory(transaction.category);
      })
      .map(transaction => ({
        id: transaction.transaction_id,
        amount: transaction.amount,
        date: parseISO(transaction.date),
        merchantName: transaction.merchant_name || null,
        category: transaction.category?.[0] || null,
        accountId: transaction.account_id
      }));
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
    const monthlyGroups = new Map<string, ProcessedTransaction[]>();

    transactions.forEach(transaction => {
      const monthKey = format(transaction.date, 'yyyy-MM');
      if (!monthlyGroups.has(monthKey)) {
        monthlyGroups.set(monthKey, []);
      }
      monthlyGroups.get(monthKey)!.push(transaction);
    });

    return Array.from(monthlyGroups.entries()).map(([monthKey, monthTransactions]) => {
      const [year, month] = monthKey.split('-').map(Number);
      return {
        year,
        month,
        totalSpending: this.sumTransactions(monthTransactions),
        transactionCount: monthTransactions.length
      };
    });
  }

  /**
   * Cleanup method for closing connections
   */
  public async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}