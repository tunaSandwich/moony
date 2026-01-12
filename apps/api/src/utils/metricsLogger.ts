/**
 * CloudWatch Metrics Logger
 * 
 * Centralized utility for logging custom application metrics to CloudWatch
 * Supports both production metrics and development mode simulation
 */

import { CloudWatchClient, PutMetricDataCommand, MetricDatum } from '@aws-sdk/client-cloudwatch';
import { logger } from '@logger';

interface CustomMetric {
  metricName: string;
  value: number;
  unit?: 'Count' | 'Seconds' | 'Milliseconds' | 'Bytes' | 'Percent';
  dimensions?: Record<string, string>;
  timestamp?: Date;
}

interface BatchMetricsOptions {
  namespace?: string;
  maxRetries?: number;
  retryDelay?: number;
}

export class MetricsLogger {
  private cloudWatchClient!: CloudWatchClient;
  private defaultNamespace: string;
  private isEnabled: boolean;
  private metricsQueue: CustomMetric[];
  private flushTimer: NodeJS.Timeout | null;

  constructor() {
    this.defaultNamespace = 'Moony/SMS';
    this.isEnabled = process.env.NODE_ENV === 'production' || process.env.ENABLE_METRICS === 'true';
    this.metricsQueue = [];
    this.flushTimer = null;

    // Initialize CloudWatch client only if metrics are enabled
    if (this.isEnabled) {
      try {
        this.cloudWatchClient = new CloudWatchClient({ 
          region: process.env.AWS_REGION 
        });
        logger.info('CloudWatch metrics logging enabled', { 
          namespace: this.defaultNamespace,
          region: process.env.AWS_REGION 
        });
      } catch (error: any) {
        logger.error('Failed to initialize CloudWatch client', { error: error.message });
        this.isEnabled = false;
      }
    } else {
      logger.info('CloudWatch metrics logging disabled', { 
        nodeEnv: process.env.NODE_ENV,
        enableMetrics: process.env.ENABLE_METRICS 
      });
    }
  }

  /**
   * Log a single metric immediately
   */
  public async logMetric(metric: CustomMetric, namespace?: string): Promise<void> {
    if (!this.isEnabled) {
      logger.debug('Metrics disabled, skipping metric', { 
        metric: metric.metricName,
        value: metric.value 
      });
      return;
    }

    try {
      const metricData: MetricDatum = {
        MetricName: metric.metricName,
        Value: metric.value,
        Unit: metric.unit || 'Count',
        Timestamp: metric.timestamp || new Date(),
        Dimensions: metric.dimensions ? Object.entries(metric.dimensions).map(([Name, Value]) => ({ Name, Value })) : undefined
      };

      await this.cloudWatchClient.send(new PutMetricDataCommand({
        Namespace: namespace || this.defaultNamespace,
        MetricData: [metricData]
      }));

      logger.debug('Metric logged successfully', {
        namespace: namespace || this.defaultNamespace,
        metricName: metric.metricName,
        value: metric.value,
        unit: metric.unit
      });

    } catch (error: any) {
      logger.error('Failed to log metric', {
        metricName: metric.metricName,
        error: error.message
      });
    }
  }

  /**
   * Queue a metric for batch processing
   */
  public queueMetric(metric: CustomMetric): void {
    if (!this.isEnabled) {
      logger.debug('Metrics disabled, skipping queued metric', { 
        metric: metric.metricName,
        value: metric.value 
      });
      return;
    }

    this.metricsQueue.push(metric);

    // Auto-flush queue when it reaches 20 metrics (CloudWatch limit per request)
    if (this.metricsQueue.length >= 20) {
      this.flushMetrics();
    }

    // Set up delayed flush if not already scheduled
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flushMetrics();
      }, 30000); // Flush every 30 seconds
    }
  }

  /**
   * Flush all queued metrics to CloudWatch
   */
  public async flushMetrics(options: BatchMetricsOptions = {}): Promise<void> {
    if (!this.isEnabled || this.metricsQueue.length === 0) {
      return;
    }

    // Clear flush timer
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    const metricsToFlush = [...this.metricsQueue];
    this.metricsQueue = [];

    try {
      const metricData: MetricDatum[] = metricsToFlush.map(metric => ({
        MetricName: metric.metricName,
        Value: metric.value,
        Unit: metric.unit || 'Count',
        Timestamp: metric.timestamp || new Date(),
        Dimensions: metric.dimensions ? Object.entries(metric.dimensions).map(([Name, Value]) => ({ Name, Value })) : undefined
      }));

      await this.cloudWatchClient.send(new PutMetricDataCommand({
        Namespace: options.namespace || this.defaultNamespace,
        MetricData: metricData
      }));

      logger.info('Batch metrics flushed successfully', {
        namespace: options.namespace || this.defaultNamespace,
        metricCount: metricData.length
      });

    } catch (error: any) {
      logger.error('Failed to flush batch metrics', {
        error: error.message,
        metricCount: metricsToFlush.length
      });

      // Re-queue failed metrics for retry (with limit to prevent infinite growth)
      if (this.metricsQueue.length < 100) {
        this.metricsQueue.unshift(...metricsToFlush);
      }
    }
  }

  /**
   * Helper methods for common SMS metrics
   */

  public logDeliverySuccess(messageId: string, channel: 'sms' | 'whatsapp' = 'sms'): void {
    this.queueMetric({
      metricName: 'DeliverySuccess',
      value: 1,
      dimensions: {
        Channel: channel,
        MessageId: messageId
      }
    });
  }

  public logDeliveryFailure(error: string, channel: 'sms' | 'whatsapp' = 'sms'): void {
    this.queueMetric({
      metricName: 'DeliveryFailure',
      value: 1,
      dimensions: {
        Channel: channel,
        ErrorType: error.substring(0, 50) // Limit dimension value length
      }
    });
  }

  public logProcessingError(operation: string, error: string): void {
    this.queueMetric({
      metricName: 'ProcessingErrors',
      value: 1,
      dimensions: {
        Operation: operation,
        ErrorType: error.substring(0, 50)
      }
    });
  }

  public logWebhookReceived(source: string): void {
    this.queueMetric({
      metricName: 'WebhookReceived',
      value: 1,
      dimensions: {
        Source: source
      }
    });
  }

  public logWebhookProcessed(source: string, success: boolean): void {
    this.queueMetric({
      metricName: success ? 'WebhookProcessed' : 'WebhookFailed',
      value: 1,
      dimensions: {
        Source: source
      }
    });
  }

  public logWebhookLatency(latencyMs: number, source: string): void {
    this.queueMetric({
      metricName: 'WebhookLatency',
      value: latencyMs,
      unit: 'Milliseconds',
      dimensions: {
        Source: source
      }
    });
  }

  public logDailySms(messageType: 'daily' | 'welcome' | 'budget'): void {
    const metricNameMap = {
      daily: 'DailyMessages',
      welcome: 'WelcomeMessages',
      budget: 'BudgetReplies'
    };

    this.queueMetric({
      metricName: metricNameMap[messageType],
      value: 1,
      dimensions: {
        MessageType: messageType
      }
    });
  }

  /**
   * Graceful shutdown - flush remaining metrics
   */
  public async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.metricsQueue.length > 0) {
      logger.info('Flushing remaining metrics before shutdown', { 
        queueLength: this.metricsQueue.length 
      });
      await this.flushMetrics();
    }
  }
}

// Singleton instance for application-wide use
export const metricsLogger = new MetricsLogger();

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  await metricsLogger.shutdown();
});

process.on('SIGINT', async () => {
  await metricsLogger.shutdown();
});
