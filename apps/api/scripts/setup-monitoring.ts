#!/usr/bin/env node
/**
 * CloudWatch Monitoring Setup for AWS SMS
 * 
 * This script sets up comprehensive monitoring for production SMS operations:
 * - Delivery failure alarms
 * - Cost monitoring alerts  
 * - Performance dashboards
 * - Custom metrics tracking
 */

import { CloudWatchClient, PutMetricAlarmCommand, PutDashboardCommand } from '@aws-sdk/client-cloudwatch';
import { SNSClient, SetSMSAttributesCommand } from '@aws-sdk/client-sns';
import { config } from 'dotenv';
import { resolve } from 'path';
import chalk from 'chalk';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const cloudWatchClient = new CloudWatchClient({ region: process.env.AWS_REGION });
const snsClient = new SNSClient({ region: process.env.AWS_REGION });

interface MonitoringConfig {
  emailNotification?: string;
  slackWebhookUrl?: string;
  costThreshold: number;
  failureThreshold: number;
  region: string;
}

class AWSMonitoringSetup {
  private config: MonitoringConfig;

  constructor(config: MonitoringConfig) {
    this.config = config;
  }

  async setupMonitoring(): Promise<void> {
    console.log(chalk.blue.bold('\n📊 Setting up AWS SMS CloudWatch Monitoring\n'));

    try {
      // 1. Enable SMS delivery status logging
      await this.enableDeliveryStatusLogging();
      
      // 2. Create CloudWatch alarms
      await this.createAlarms();
      
      // 3. Create monitoring dashboard
      await this.createDashboard();
      
      // 4. Display setup summary
      this.displaySummary();
      
    } catch (error: any) {
      console.log(chalk.red('\n❌ Monitoring setup failed:'), error.message);
      throw error;
    }
  }

  private async enableDeliveryStatusLogging(): Promise<void> {
    console.log(chalk.cyan('🔧 Step 1: Enabling SMS Delivery Status Logging'));

    try {
      // Enable successful delivery logging
      await snsClient.send(new SetSMSAttributesCommand({
        attributes: {
          'DeliveryStatusLogging': 'true',
          'DeliveryStatusSuccessSamplingRate': '100'
        }
      }));

      console.log(chalk.green('   ✅ SMS delivery status logging enabled'));
      console.log(chalk.gray('   📋 Delivery logs will appear in CloudWatch Logs'));
      
    } catch (error: any) {
      console.log(chalk.yellow('   ⚠️  Could not enable delivery logging:'), error.message);
      console.log(chalk.gray('   💡 This may need to be enabled manually in AWS Console'));
    }
  }

  private async createAlarms(): Promise<void> {
    console.log(chalk.cyan('\n🚨 Step 2: Creating CloudWatch Alarms'));

    // Alarm 1: High SMS Failure Rate
    const failureAlarm = new PutMetricAlarmCommand({
      AlarmName: 'moony-sms-high-failure-rate',
      AlarmDescription: 'Alert when SMS delivery failures exceed threshold',
      ComparisonOperator: 'GreaterThanThreshold',
      EvaluationPeriods: 2,
      MetricName: 'NumberOfMessagesFailed',
      Namespace: 'AWS/SNS',
      Period: 300, // 5 minutes
      Statistic: 'Sum',
      Threshold: this.config.failureThreshold,
      ActionsEnabled: true,
      TreatMissingData: 'notBreaching',
      Tags: [
        { Key: 'Application', Value: 'moony' },
        { Key: 'Service', Value: 'SMS' }
      ]
    });

    // Alarm 2: Daily SMS Cost Threshold
    const costAlarm = new PutMetricAlarmCommand({
      AlarmName: 'moony-sms-daily-cost-threshold',
      AlarmDescription: 'Alert when daily SMS costs exceed budget threshold',
      ComparisonOperator: 'GreaterThanThreshold',
      EvaluationPeriods: 1,
      MetricName: 'SMSMonthToDateSpentUSD',
      Namespace: 'AWS/SNS',
      Period: 86400, // 24 hours
      Statistic: 'Maximum',
      Threshold: this.config.costThreshold,
      ActionsEnabled: true,
      TreatMissingData: 'notBreaching',
      Tags: [
        { Key: 'Application', Value: 'moony' },
        { Key: 'Service', Value: 'SMS' },
        { Key: 'AlertType', Value: 'Cost' }
      ]
    });

    // Alarm 3: Custom Application Metrics - Message Processing Errors
    const processingErrorAlarm = new PutMetricAlarmCommand({
      AlarmName: 'moony-sms-processing-errors',
      AlarmDescription: 'Alert when message processing errors exceed threshold',
      ComparisonOperator: 'GreaterThanThreshold',
      EvaluationPeriods: 2,
      MetricName: 'ProcessingErrors',
      Namespace: 'Moony/SMS',
      Period: 300, // 5 minutes
      Statistic: 'Sum',
      Threshold: 5,
      ActionsEnabled: true,
      TreatMissingData: 'notBreaching',
      Tags: [
        { Key: 'Application', Value: 'moony' },
        { Key: 'Service', Value: 'SMS' },
        { Key: 'AlertType', Value: 'Processing' }
      ]
    });

    // Alarm 4: Webhook Response Time
    const webhookLatencyAlarm = new PutMetricAlarmCommand({
      AlarmName: 'moony-webhook-high-latency',
      AlarmDescription: 'Alert when webhook processing takes too long',
      ComparisonOperator: 'GreaterThanThreshold',
      EvaluationPeriods: 3,
      MetricName: 'WebhookLatency',
      Namespace: 'Moony/SMS',
      Period: 300, // 5 minutes
      Statistic: 'Average',
      Threshold: 5000, // 5 seconds
      ActionsEnabled: true,
      TreatMissingData: 'notBreaching',
      Tags: [
        { Key: 'Application', Value: 'moony' },
        { Key: 'Service', Value: 'SMS' },
        { Key: 'AlertType', Value: 'Performance' }
      ]
    });

    try {
      await cloudWatchClient.send(failureAlarm);
      console.log(chalk.green('   ✅ High failure rate alarm created'));

      await cloudWatchClient.send(costAlarm);
      console.log(chalk.green('   ✅ Daily cost threshold alarm created'));

      await cloudWatchClient.send(processingErrorAlarm);
      console.log(chalk.green('   ✅ Processing error alarm created'));

      await cloudWatchClient.send(webhookLatencyAlarm);
      console.log(chalk.green('   ✅ Webhook latency alarm created'));

    } catch (error: any) {
      console.log(chalk.red('   ❌ Failed to create alarms:'), error.message);
      throw error;
    }
  }

  private async createDashboard(): Promise<void> {
    console.log(chalk.cyan('\n📈 Step 3: Creating Monitoring Dashboard'));

    const dashboardBody = {
      widgets: [
        {
          type: 'metric',
          x: 0, y: 0, width: 12, height: 6,
          properties: {
            metrics: [
              ['AWS/SNS', 'NumberOfMessagesPublished', { 'label': 'Messages Sent' }],
              ['.', 'NumberOfMessagesFailed', { 'label': 'Messages Failed' }],
              ['Moony/SMS', 'DeliverySuccess', { 'label': 'Successful Deliveries' }],
              ['.', 'DeliveryFailure', { 'label': 'Failed Deliveries' }]
            ],
            view: 'timeSeries',
            stacked: false,
            region: this.config.region,
            title: 'SMS Delivery Status',
            period: 300,
            stat: 'Sum',
            yAxis: {
              left: {
                min: 0
              }
            }
          }
        },
        {
          type: 'metric',
          x: 12, y: 0, width: 12, height: 6,
          properties: {
            metrics: [
              ['AWS/SNS', 'SMSMonthToDateSpentUSD', { 'label': 'Monthly Spend ($)' }]
            ],
            view: 'timeSeries',
            stacked: false,
            region: this.config.region,
            title: 'SMS Costs',
            period: 3600,
            stat: 'Maximum',
            yAxis: {
              left: {
                min: 0
              }
            }
          }
        },
        {
          type: 'metric',
          x: 0, y: 6, width: 8, height: 6,
          properties: {
            metrics: [
              ['Moony/SMS', 'DailyMessages', { 'label': 'Daily SMS' }],
              ['.', 'WelcomeMessages', { 'label': 'Welcome SMS' }],
              ['.', 'BudgetReplies', { 'label': 'Budget Replies' }]
            ],
            view: 'timeSeries',
            stacked: true,
            region: this.config.region,
            title: 'Message Types',
            period: 3600,
            stat: 'Sum'
          }
        },
        {
          type: 'metric',
          x: 8, y: 6, width: 8, height: 6,
          properties: {
            metrics: [
              ['Moony/SMS', 'WebhookReceived', { 'label': 'Webhooks Received' }],
              ['.', 'WebhookProcessed', { 'label': 'Webhooks Processed' }],
              ['.', 'WebhookFailed', { 'label': 'Webhook Failures' }]
            ],
            view: 'timeSeries',
            stacked: false,
            region: this.config.region,
            title: 'Webhook Processing',
            period: 300,
            stat: 'Sum'
          }
        },
        {
          type: 'metric',
          x: 16, y: 6, width: 8, height: 6,
          properties: {
            metrics: [
              ['Moony/SMS', 'WebhookLatency', { 'label': 'Processing Time (ms)' }]
            ],
            view: 'timeSeries',
            stacked: false,
            region: this.config.region,
            title: 'Webhook Performance',
            period: 300,
            stat: 'Average',
            yAxis: {
              left: {
                min: 0
              }
            }
          }
        },
        {
          type: 'number',
          x: 0, y: 12, width: 6, height: 3,
          properties: {
            metrics: [
              ['Moony/SMS', 'DeliverySuccess']
            ],
            view: 'singleValue',
            region: this.config.region,
            title: 'Total Successful Deliveries',
            period: 86400,
            stat: 'Sum'
          }
        },
        {
          type: 'number',
          x: 6, y: 12, width: 6, height: 3,
          properties: {
            metrics: [
              ['AWS/SNS', 'SMSMonthToDateSpentUSD']
            ],
            view: 'singleValue',
            region: this.config.region,
            title: 'Month-to-Date Spend',
            period: 86400,
            stat: 'Maximum'
          }
        },
        {
          type: 'number',
          x: 12, y: 12, width: 6, height: 3,
          properties: {
            metrics: [
              ['Moony/SMS', 'DeliveryFailure']
            ],
            view: 'singleValue',
            region: this.config.region,
            title: 'Total Failed Deliveries',
            period: 86400,
            stat: 'Sum'
          }
        },
        {
          type: 'number',
          x: 18, y: 12, width: 6, height: 3,
          properties: {
            metrics: [
              ['Moony/SMS', 'WebhookLatency']
            ],
            view: 'singleValue',
            region: this.config.region,
            title: 'Avg Webhook Latency (ms)',
            period: 3600,
            stat: 'Average'
          }
        }
      ]
    };

    const dashboard = new PutDashboardCommand({
      DashboardName: 'moony-sms-monitoring',
      DashboardBody: JSON.stringify(dashboardBody)
    });

    try {
      await cloudWatchClient.send(dashboard);
      console.log(chalk.green('   ✅ Monitoring dashboard created'));
    } catch (error: any) {
      console.log(chalk.red('   ❌ Failed to create dashboard:'), error.message);
      throw error;
    }
  }

  private displaySummary(): void {
    console.log(chalk.cyan('\n📋 Monitoring Setup Summary:'));
    console.log(chalk.green('✅ CloudWatch Alarms:'));
    console.log(chalk.gray('   • High SMS failure rate (threshold: >' + this.config.failureThreshold + ' failures/5min)'));
    console.log(chalk.gray('   • Daily cost threshold (threshold: >$' + this.config.costThreshold + '/day)'));
    console.log(chalk.gray('   • Message processing errors (threshold: >5 errors/5min)'));
    console.log(chalk.gray('   • Webhook latency (threshold: >5 seconds avg)'));

    console.log(chalk.green('\n✅ Monitoring Dashboard:'));
    console.log(chalk.gray('   • SMS delivery status and costs'));
    console.log(chalk.gray('   • Message type breakdown'));
    console.log(chalk.gray('   • Webhook processing metrics'));
    console.log(chalk.gray('   • Performance indicators'));

    console.log(chalk.green('\n✅ Delivery Status Logging:'));
    console.log(chalk.gray('   • 100% sampling rate for successful deliveries'));
    console.log(chalk.gray('   • Logs appear in CloudWatch Logs'));

    console.log(chalk.cyan('\n🔗 Access Your Monitoring:'));
    const dashboardUrl = `https://console.aws.amazon.com/cloudwatch/home?region=${this.config.region}#dashboards:name=moony-sms-monitoring`;
    const alarmsUrl = `https://console.aws.amazon.com/cloudwatch/home?region=${this.config.region}#alarmsV2:`;
    
    console.log(chalk.blue('📊 Dashboard: ') + dashboardUrl);
    console.log(chalk.blue('🚨 Alarms: ') + alarmsUrl);

    console.log(chalk.cyan('\n⚠️  Next Steps:'));
    console.log(chalk.yellow('1. Configure SNS topics for alarm notifications'));
    console.log(chalk.yellow('2. Add email/Slack endpoints to alarms'));
    console.log(chalk.yellow('3. Test alarm thresholds with synthetic traffic'));
    console.log(chalk.yellow('4. Enable AWS Cost Explorer for detailed cost analysis'));

    console.log(chalk.green('\n🎉 AWS SMS monitoring is now configured!'));
  }
}

// Main execution
async function main() {
  try {
    // Validate environment
    if (!process.env.AWS_REGION) {
      throw new Error('AWS_REGION environment variable is required');
    }

    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS credentials are required');
    }

    const config: MonitoringConfig = {
      region: process.env.AWS_REGION,
      costThreshold: 50, // $50/day threshold
      failureThreshold: 10, // 10 failures in 5 minutes
      emailNotification: process.env.ADMIN_EMAIL,
      slackWebhookUrl: process.env.SLACK_WEBHOOK_URL
    };

    const setup = new AWSMonitoringSetup(config);
    await setup.setupMonitoring();

  } catch (error: any) {
    console.log(chalk.red('\n💥 Setup failed:'), error.message);
    console.log(chalk.yellow('\n💡 Troubleshooting:'));
    console.log(chalk.gray('1. Ensure AWS credentials have CloudWatch permissions'));
    console.log(chalk.gray('2. Verify AWS_REGION is set correctly'));
    console.log(chalk.gray('3. Check IAM permissions for SNS and CloudWatch'));
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n🛑 Setup interrupted by user'));
  process.exit(1);
});

main();