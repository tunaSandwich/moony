import { Transaction } from 'plaid';

export interface SpendingMetrics {
  averageMonthlySpending: number;
  lastMonthSpending: number;
  currentMonthSpending: number;
  lastCalculatedAt: Date;
}

export interface ProcessedTransaction {
  id: string;
  amount: number;
  date: Date;
  merchantName: string | null;
  category: string | null;
  accountId: string;
}

export interface MonthlySpending {
  year: number;
  month: number;
  totalSpending: number;
  transactionCount: number;
}

export interface AnalyticsProcessingOptions {
  daysRequested?: number;
  retryCount?: number;
  maxRetries?: number;
}

export interface AnalyticsError {
  userId: string;
  error: string;
  errorType: string;
  attempt: number;
  timestamp: Date;
}

// Removed unused TransactionSyncResult interface

// Plaid specific types for our use case
export interface PlaidTransactionResponse {
  transactions: Transaction[];
  total_transactions: number;
  has_more: boolean;
  next_cursor?: string;
}

// Analytics job status for future queue integration
export interface AnalyticsJobStatus {
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  retryCount: number;
}

export const ANALYTICS_CONSTANTS = {
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAYS: [1000, 2000, 4000], // Exponential backoff in milliseconds
  DEFAULT_DAYS_REQUESTED: 180, // 6 months
  SPENDING_TRANSACTION_THRESHOLD: 0.01, // Minimum amount to consider as spending
} as const;