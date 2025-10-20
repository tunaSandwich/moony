AWS SNS Migration Plan - Complete Reference Document
Project: moony - Twilio to AWS End User Messaging Migration
Date: October 10, 2025
Status: Planning Phase Complete - Ready for Implementation

Executive Summary
Migrating from Twilio to AWS End User Messaging SMS for operational messaging while keeping Twilio Verify for phone number verification. This hybrid approach solves 10DLC approval issues with Twilio while maintaining proven verification flows.
Key Decisions:

✅ AWS End User Messaging SMS for two-way operational messaging
✅ Keep Twilio Verify for phone verification only
✅ Remove WhatsApp (replaced by AWS sandbox for testing)
✅ Webhooks hosted on Railway staging via Express API
✅ Region: us-west-1 (N. California - closest to Santa Barbara)


Architecture Overview
Current State (Twilio)
User Registration Flow:
User → Frontend → API → Twilio Verify → SMS Verification Code
                              ↓
                    Update phoneVerified in DB
                              ↓
                    Twilio SMS → Welcome Message + Analytics

Daily Messaging:
Scheduler → API → Twilio SMS → Daily Spending Guidance

User Interaction:
User replies → Twilio Webhook → API → Process Budget Input
Future State (Hybrid: Twilio + AWS)
Phone Verification (KEEP TWILIO):
User → Frontend → API → Twilio Verify → SMS Verification Code
                              ↓
                    Update phoneVerified in DB

Operational Messaging (NEW: AWS):
Welcome Message:
Phone Verified → API → AWS End User Messaging → Welcome SMS + Analytics

Daily Messaging:
Scheduler → API → AWS End User Messaging → Daily Spending Guidance

User Interaction (NEW: AWS TWO-WAY):
User replies "2000" → AWS End User Messaging → SNS Topic → API Webhook
                                                                  ↓
                                                    Parse & Update Budget
                                                                  ↓
                                                    AWS SMS → Confirmation

Technology Stack
Messaging Services
ServicePurposeProviderPhone VerificationSend & verify SMS codesTwilio VerifyWelcome MessagesPost-verification onboardingAWS End User MessagingDaily GuidanceScheduled spending updatesAWS End User MessagingBudget RepliesTwo-way SMS interactionAWS End User Messaging + SNS
AWS Services Used

AWS End User Messaging SMS (formerly Pinpoint SMS)

Send outbound SMS
Receive inbound SMS
Two-way messaging configuration


Amazon SNS (Simple Notification Service)

Topic to receive incoming messages
Webhook delivery to Railway API
Message routing


IAM (Identity and Access Management)

Secure credentials for API access
Role-based permissions


CloudWatch Logs (optional but recommended)

Delivery status tracking
Error monitoring



Infrastructure

Hosting: Railway (staging environment shown in screenshot)
API Framework: Express.js (Node.js/TypeScript)
Database: PostgreSQL (via Prisma ORM)
Scheduler: Node-cron (for daily SMS jobs)


Detailed Phase Breakdown
Phase 1: AWS Setup & Configuration
Duration: 1 day
Goal: Get AWS infrastructure ready for development
Tasks:

AWS Account & IAM Setup

Create/configure AWS account
Create IAM user for programmatic access
Generate access keys (Access Key ID + Secret Access Key)
Install & configure AWS CLI


AWS End User Messaging SMS Configuration

Navigate to AWS End User Messaging console
Enable SMS channel in us-west-1 region
Account automatically placed in sandbox mode


Sandbox Setup for Testing

Add your phone number to sandbox (free testing)
Verify phone number via OTP
Can add up to 10 verified numbers
$1/month spending limit in sandbox


Request Origination Identity

For US: Request 10DLC phone number
This is your "from" number users will see
Submit company registration
Estimated provisioning: 1-2 weeks (parallelize with development)


Create SNS Topic for Incoming Messages

Navigate to Amazon SNS console
Create Standard Topic: moony-incoming-sms
Note the Topic ARN for webhook configuration


Configure Two-Way SMS

In End User Messaging, enable two-way SMS on phone number
Set destination type: Amazon SNS
Select the SNS topic created above
Set up IAM role for SNS publishing



Success Criteria:

 Can send test SMS from AWS console to your verified number
 Can reply to that SMS and see message in SNS topic
 AWS CLI configured and authenticated
 Environment variables documented

Environment Variables Needed:
bash# AWS Configuration
AWS_REGION=us-west-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_PHONE_NUMBER=+1234567890  # Your 10DLC number
AWS_SNS_TOPIC_ARN=arn:aws:sns:us-west-1:xxxx:moony-incoming-sms

# Keep existing Twilio for verification
TWILIO_ACCOUNT_SID=existing_value
TWILIO_AUTH_TOKEN=existing_value
TWILIO_VERIFY_SERVICE_SID=existing_value

Phase 2: Backend Service Layer
Duration: 2 days
Goal: Create clean, modular AWS messaging services
New File Structure:
apps/api/src/
├── config/
│   └── aws.ts                 # AWS SDK configuration & validation
├── services/
│   └── aws/
│       ├── clients/
│       │   └── awsClients.ts  # SNS & End User Messaging client initialization
│       ├── smsService.ts      # Send SMS business logic
│       └── incomingMessageHandler.ts  # Process incoming SMS
├── controllers/
│   └── smsWebhookController.ts  # Handle SNS webhook from AWS
├── routes/
│   └── aws-webhooks.ts        # Route for incoming SMS webhook
└── types/
    └── aws.ts                 # AWS-specific TypeScript types
Key Architecture Principles:
1. Separation of Concerns
typescript// config/aws.ts - Configuration only
export const awsConfig = {
  region: process.env.AWS_REGION || 'us-west-1',
  credentials: {
    accessKeyId: requireEnv('AWS_ACCESS_KEY_ID'),
    secretAccessKey: requireEnv('AWS_SECRET_ACCESS_KEY'),
  },
  phoneNumber: requireEnv('AWS_PHONE_NUMBER'),
  snsTopicArn: requireEnv('AWS_SNS_TOPIC_ARN'),
  sandboxMode: process.env.NODE_ENV !== 'production',
} as const;

// clients/awsClients.ts - SDK initialization
export class AWSClients {
  private static snsClient: SNSClient;
  private static smsClient: PinpointSMSVoiceV2Client;
  
  static getSNSClient(): SNSClient {
    if (!this.snsClient) {
      this.snsClient = new SNSClient({
        region: awsConfig.region,
        credentials: awsConfig.credentials,
      });
    }
    return this.snsClient;
  }
  
  static getSMSClient(): PinpointSMSVoiceV2Client {
    if (!this.smsClient) {
      this.smsClient = new PinpointSMSVoiceV2Client({
        region: awsConfig.region,
        credentials: awsConfig.credentials,
      });
    }
    return this.smsClient;
  }
}
2. Clean Service Interface
typescript// services/aws/smsService.ts
export interface SendSMSParams {
  to: string;           // E.164 format: +1234567890
  body: string;
  messageType?: 'TRANSACTIONAL' | 'PROMOTIONAL';
}

export interface SendSMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  retryable: boolean;
}

export class AWSSMSService {
  async sendMessage(params: SendSMSParams): Promise<SendSMSResult> {
    try {
      // Validate phone number format
      // Send via AWS End User Messaging
      // Return structured result
    } catch (error) {
      // Comprehensive error handling with retry logic
    }
  }
  
  async sendBulkMessages(messages: SendSMSParams[]): Promise<SendSMSResult[]> {
    // Batch processing with rate limiting
  }
}
3. Webhook Handler
typescript// services/aws/incomingMessageHandler.ts
export class IncomingMessageHandler {
  async processIncomingMessage(snsMessage: SNSMessage): Promise<void> {
    // 1. Parse AWS message format
    // 2. Extract: originationNumber, destinationNumber, messageBody
    // 3. Validate user exists in database
    // 4. Parse budget amount from text
    // 5. Update user.monthlyBudget
    // 6. Send confirmation SMS
    // 7. Log interaction
  }
  
  private extractBudgetAmount(messageBody: string): number | null {
    // Smart parsing: "2000", "$2000", "2,000", "two thousand"
  }
  
  private async sendConfirmation(phoneNumber: string, budget: number): Promise<void> {
    // Send confirmation: "Got it! Your budget is set to $2,000 for October."
  }
}
4. Controller for Webhook
typescript// controllers/smsWebhookController.ts
export class SMSWebhookController {
  async handleIncomingSMS(req: Request, res: Response): Promise<void> {
    try {
      // 1. Verify SNS signature (security!)
      // 2. Parse SNS notification
      // 3. Handle subscription confirmation (first-time setup)
      // 4. Process actual SMS message
      // 5. Return 200 immediately (async processing)
      
      res.status(200).json({ received: true });
      
      // Process message asynchronously
      await incomingMessageHandler.processIncomingMessage(snsMessage);
    } catch (error) {
      logger.error('Webhook processing failed', { error });
      res.status(500).json({ error: 'Processing failed' });
    }
  }
}
Success Criteria:

 Can send SMS via new service from Node.js
 Error handling covers all AWS error codes
 TypeScript types are comprehensive
 Unit tests written for core logic
 Logging includes AWS message IDs for tracking


Phase 3: Migrate Welcome Messages
Duration: 1 day
Goal: Switch welcome messages from Twilio to AWS
Files to Modify:
1. apps/api/src/controllers/twilioController.ts
Current sendWelcomeSMS method (lines ~200-280):
typescriptpublic sendWelcomeSMS = async (userId: string): Promise<void> => {
  // ... existing analytics logic ...
  
  // CURRENT: Uses messagingService (Twilio/WhatsApp)
  const result = await this.messagingService.sendMessage({
    to: user.phoneNumber,
    body: message
  });
}
After Migration:
typescript// NEW: Import AWS service
import { AWSSMSService } from '../services/aws/smsService.js';

export class TwilioController {
  private twilioClient: twilio.Twilio;
  private awsSMSService: AWSSMSService;  // NEW
  
  constructor() {
    // ... existing Twilio init ...
    this.awsSMSService = new AWSSMSService();  // NEW
  }
  
  public sendWelcomeSMS = async (userId: string): Promise<void> => {
    try {
      // ... keep all existing analytics logic ...
      
      // CHANGED: Use AWS instead of Twilio
      const result = await this.awsSMSService.sendMessage({
        to: user.phoneNumber,
        body: message,
        messageType: 'TRANSACTIONAL'
      });
      
      if (result.success) {
        logger.info('Welcome message sent via AWS', { 
          userId,
          messageId: result.messageId,
          scenario: /* same logic */
        });
      } else {
        logger.error('Welcome message failed', {
          userId,
          error: result.error
        });
      }
    } catch (error: any) {
      logger.error('Failed to send welcome message', { 
        userId, 
        error: error.message 
      });
    }
  };
}
Changes Summary:

✅ Keep all phone verification logic (Twilio Verify)
✅ Keep all analytics calculation logic
✅ Only change: SMS sending mechanism
✅ Remove WhatsApp fallback (no longer needed)
✅ Update error handling for AWS error types
✅ Maintain non-blocking behavior

Testing Checklist:

 Phone verification still works (Twilio)
 After verification, welcome SMS sent via AWS
 Scenario A (full data) displays correctly
 Scenario B (partial data) displays correctly
 Scenario C (no data) displays correctly
 Dev mode bypass (NODE_ENV=local) works
 Error logs include AWS message IDs


Phase 4: Incoming Message Webhook
Duration: 2 days
Goal: Handle user budget replies via AWS webhooks on Railway
Railway Webhook Setup:
1. Expose Webhook Endpoint
typescript// apps/api/src/routes/aws-webhooks.ts
import { Router } from 'express';
import { SMSWebhookController } from '../controllers/smsWebhookController.js';

const router = Router();
const webhookController = new SMSWebhookController();

// Public endpoint - SNS will call this
router.post('/incoming-sms', webhookController.handleIncomingSMS);

export default router;
2. Register Route in Main App
typescript// apps/api/src/routes/index.ts
import awsWebhooksRouter from './aws-webhooks.js';

// Add to route registration
app.use('/api/webhooks/aws', awsWebhooksRouter);

// Final URL: https://api-staging.railway.app/api/webhooks/aws/incoming-sms
3. Configure SNS Subscription

In AWS Console, go to your SNS topic
Create new subscription:

Protocol: HTTPS
Endpoint: https://api-staging.railway.app/api/webhooks/aws/incoming-sms


AWS will send confirmation request
Your endpoint must respond to confirm subscription

Message Flow:
User texts "2000" to your AWS phone number
         ↓
AWS End User Messaging receives message
         ↓
Publishes to SNS Topic (moony-incoming-sms)
         ↓
SNS sends HTTPS POST to Railway webhook
         ↓
Railway API: /api/webhooks/aws/incoming-sms
         ↓
Webhook validates SNS signature
         ↓
Extracts: originationNumber (+1234567890), messageBody ("2000")
         ↓
Looks up user by phoneNumber in database
         ↓
Parses budget amount: 2000
         ↓
Updates: user.monthlyBudget = 2000
         ↓
Sends confirmation SMS via AWS: "Got it! Your budget is set to $2,000 for October."
         ↓
Returns 200 OK to SNS
Security Implementation:
SNS Signature Verification:
typescriptimport crypto from 'crypto';

async function verifySNSSignature(req: Request): Promise<boolean> {
  const signature = req.headers['x-amz-sns-signature'] as string;
  const signingCertURL = req.headers['x-amz-sns-signing-cert-url'] as string;
  
  // 1. Verify cert URL is from AWS
  if (!signingCertURL.startsWith('https://sns.us-west-1.amazonaws.com/')) {
    return false;
  }
  
  // 2. Fetch certificate
  // 3. Build signature string
  // 4. Verify signature matches
  
  return true;
}
Rate Limiting:
typescript// Prevent webhook abuse
import rateLimit from 'express-rate-limit';

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
});

router.post('/incoming-sms', webhookLimiter, webhookController.handleIncomingSMS);
Success Criteria:

 SNS subscription confirmed successfully
 Can receive test message from AWS console
 Webhook parses message correctly
 User lookup by phone number works
 Budget amount extracted correctly from various formats
 Database update successful
 Confirmation SMS sent back to user
 Logs include full message trace
 Security validation passes


Phase 5: Daily SMS Migration
Duration: 1 day
Goal: Switch daily spending messages to AWS
Files to Modify:
1. apps/api/src/services/dailySmsService.ts
Current Implementation:
typescript// Uses Twilio client
import { twilioClient } from '@config/twilio';

async sendDailyMessages() {
  for (const user of users) {
    await twilioClient.messages.create({
      to: user.phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER,
      body: message
    });
  }
}
After Migration:
typescriptimport { AWSSMSService } from './aws/smsService.js';

export class DailySMSService {
  private awsSMSService: AWSSMSService;
  
  constructor() {
    this.awsSMSService = new AWSSMSService();
  }
  
  async sendDailyMessages(): Promise<void> {
    // ... existing user query logic ...
    
    for (const user of users) {
      const message = this.buildDailyMessage(user);
      
      const result = await this.awsSMSService.sendMessage({
        to: user.phoneNumber,
        body: message,
        messageType: 'TRANSACTIONAL'
      });
      
      if (result.success) {
        logger.info('Daily SMS sent', { 
          userId: user.id, 
          messageId: result.messageId 
        });
      } else {
        logger.error('Daily SMS failed', { 
          userId: user.id, 
          error: result.error,
          retryable: result.retryable
        });
      }
      
      // Rate limiting: AWS allows ~20 SMS/second in sandbox
      await this.delay(100); // 10 messages/second to be safe
    }
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
2. apps/scheduler/index.ts
No changes needed if scheduler already calls dailySmsService.sendDailyMessages().
Batch Optimization (Optional):
If you have many users, consider batching:
typescriptasync sendDailyMessagesBatch(): Promise<void> {
  const BATCH_SIZE = 10;
  const batches = this.chunkArray(users, BATCH_SIZE);
  
  for (const batch of batches) {
    const promises = batch.map(user => 
      this.awsSMSService.sendMessage({
        to: user.phoneNumber,
        body: this.buildDailyMessage(user),
        messageType: 'TRANSACTIONAL'
      })
    );
    
    await Promise.all(promises);
    await this.delay(1000); // 1 second between batches
  }
}
Success Criteria:

 Daily cron job runs successfully
 Messages sent via AWS (verify in CloudWatch logs)
 Error handling works for failed sends
 Rate limiting prevents throttling
 Message IDs logged for tracking
 Failed messages flagged for retry


Phase 6: Clean Up & Refactor
Duration: 1 day
Goal: Remove unnecessary Twilio code, rename files for clarity
File Renames:
Backend:
apps/api/src/controllers/
  twilioController.ts → phoneVerificationController.ts

apps/api/src/routes/
  twilio.ts → phoneVerification.ts

apps/api/src/services/
  messagingService.ts → DELETE (no longer needed)
Frontend:
apps/web/src/api/
  twilio.ts → phoneVerification.ts
Code Changes:
1. Update Controller Name & Imports:
typescript// apps/api/src/controllers/phoneVerificationController.ts
export class PhoneVerificationController {
  // Only verification methods remain:
  // - sendVerificationCode()
  // - verifyNumber()
  // - sendWelcomeSMS() (but uses AWS internally)
  // - resendWelcomeMessage()
}
2. Update Routes:
typescript// apps/api/src/routes/phoneVerification.ts
import { PhoneVerificationController } from '../controllers/phoneVerificationController.js';

const controller = new PhoneVerificationController();

// Keep same route paths for backwards compatibility
router.post('/send-code', ...middleware, controller.sendVerificationCode);
router.post('/verify-number', ...middleware, controller.verifyNumber);
router.post('/resend-welcome', ...middleware, controller.resendWelcomeMessage);
3. Update Main Routes File:
typescript// apps/api/src/routes/index.ts
import phoneVerificationRouter from './phoneVerification.js';
import awsWebhooksRouter from './aws-webhooks.js';

// Keep /api/twilio/* for backwards compatibility with deployed frontend
app.use('/api/twilio', phoneVerificationRouter);
app.use('/api/webhooks/aws', awsWebhooksRouter);
4. Frontend API Client:
typescript// apps/web/src/api/phoneVerification.ts (renamed from twilio.ts)
export const phoneVerificationApi = {
  async sendVerificationCode(phoneNumber?: string): Promise<SendVerificationCodeResponse> {
    const response = await apiClient.post<SendVerificationCodeResponse>(
      '/api/twilio/send-code',  // Keep same path
      phoneNumber ? { phoneNumber } : {}
    );
    return response.data;
  },
  
  // ... other methods unchanged
};
5. Delete Obsolete Files:

❌ apps/api/src/services/messagingService.ts (WhatsApp fallback no longer needed)
❌ packages/config/twilio.ts (can keep for now, only used by verification)

Environment Variables Update:
Remove:
bashTWILIO_PHONE_NUMBER  # No longer needed for operational SMS
Keep:
bashTWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_VERIFY_SERVICE_SID
Add:
bashAWS_REGION=us-west-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_PHONE_NUMBER=+1234567890
AWS_SNS_TOPIC_ARN=arn:aws:sns:...
Documentation Updates:
Create: docs/AWS_MESSAGING_GUIDE.md
markdown# AWS Messaging Implementation

## Overview
moony uses a hybrid approach:
- **Twilio Verify**: Phone number verification only
- **AWS End User Messaging**: All operational SMS (welcome, daily, two-way)

## Architecture
[Diagram of message flows]

## Local Development
1. Set AWS credentials in `.env`
2. Add your phone to AWS sandbox
3. Test sending/receiving via sandbox

## Webhook Testing
Use ngrok to test webhooks locally:
```bash
ngrok http 3000
# Update SNS subscription endpoint to ngrok URL
Deployment
[Railway deployment instructions]

#### Success Criteria:
- [ ] All file renames complete
- [ ] All import paths updated
- [ ] Frontend still works with renamed API
- [ ] No Twilio references except verification
- [ ] Documentation updated
- [ ] Environment variables documented
- [ ] Code passes linting
- [ ] All tests still pass

---

### **Phase 7: Production Preparation**
**Duration:** 2 days + waiting period  
**Goal:** Request sandbox exit and prepare for production

#### Pre-Production Checklist:

**1. Thorough Testing in Sandbox:**
- [ ] Send/receive 50+ test messages
- [ ] Test all message scenarios (welcome, daily, budget reply)
- [ ] Test error handling (invalid phone, network errors)
- [ ] Test rate limiting
- [ ] Load test with 10 verified numbers
- [ ] Verify webhook reliability (99%+ success rate)

**2. Monitoring Setup:**

**CloudWatch Logs for Delivery Tracking:**
```typescript
// Enable delivery status logging in AWS console:
// Text messaging (SMS) → Account settings → Delivery status logging

// Your logs will show:
{
  "notification": {
    "messageId": "msg-123",
    "timestamp": "2025-10-10T12:00:00Z",
    "destination": "+1234567890",
    "priceInUSD": "0.00645",
    "deliveryStatus": "SUCCESSFUL",
    "providerResponse": "Message delivered"
  }
}
CloudWatch Alerts:
yamlAlert 1: High Failure Rate
  Metric: DeliveryFailures > 5% in 5 minutes
  Action: Email to admin

Alert 2: Webhook Errors
  Metric: HTTP 5xx responses > 10 in 5 minutes
  Action: Slack notification

Alert 3: Daily Spending Threshold
  Metric: Daily SMS cost > $50
  Action: Email alert
3. Request Production Access:
AWS Support Case - Required Information:
Service: AWS End User Messaging SMS
Request Type: Move out of SMS Sandbox

1. Website URL or App Name:
   moony (https://budgetpal.app)

2. Type of Messages:
   ☑ Transactional
   - Daily spending guidance
   - Budget confirmations
   - Welcome messages

3. AWS Region:
   us-west-1 (N. California)

4. Countries Where Sending:
   United States only (initially)

5. Customer Opt-In Process:
   Users explicitly verify their phone number during registration.
   They consent to receiving daily spending updates.
   Users can opt out by replying STOP at any time.

6. Message Templates:
   
   Template 1 - Welcome Message:
   "👋 Welcome [Name]! I'll help you stay on track with daily 
   spending guidance. Your October spending so far: $XXX. 
   What's your spending goal for this month?"
   
   Template 2 - Daily Guidance:
   "Good morning [Name]! 🌅 You have $XXX remaining for 
   today. You're currently [on track/over budget] for October."
   
   Template 3 - Budget Confirmation:
   "Got it! Your budget is set to $XXX for October."

7. Use Case Description:
   moony is a personal finance app that sends daily SMS 
   reminders to help users stay within their monthly spending budget. 
   Users link their bank accounts, set a monthly budget, and receive 
   daily text messages with their remaining budget for the day.

8. Monthly Volume Estimate:
   Starting: 100 users × 30 messages/month = 3,000 SMS/month
   6 months: 1,000 users × 30 messages/month = 30,000 SMS/month

9. Requested Spending Limit:
   $100/month initially (will increase as we grow)
4. 10DLC Registration:
Campaign Type: Mixed (Customer Care + Account Notifications)

Company Information:
- Legal Business Name: [Your Company]
- EIN: [Your EIN]
- Business Address: [Address]
- Website: https://budgetpal.app

Campaign Details:
- Campaign Description: Daily spending guidance for personal budgeting
- Sample Messages: [Same as above]
- Opt-in Process: Phone verification during registration
- Opt-out: Reply STOP
- Help Info: Reply HELP for support
Typical Approval Timeline:

AWS Sandbox Exit: 24-48 hours
10DLC Registration: 1-2 weeks (faster than Twilio based on your experience!)

5. Production Environment Variables:
bash# Railway Production Environment
NODE_ENV=production

# AWS Production
AWS_REGION=us-west-1
AWS_ACCESS_KEY_ID=[production_key]
AWS_SECRET_ACCESS_KEY=[production_secret]
AWS_PHONE_NUMBER=[approved_10dlc_number]
AWS_SNS_TOPIC_ARN=[production_topic_arn]

# Twilio (Verification Only)
TWILIO_ACCOUNT_SID=[existing]
TWILIO_AUTH_TOKEN=[existing]
TWILIO_VERIFY_SERVICE_SID=[existing]

# Database
DATABASE_URL=[production_postgres_url]
6. Rollout Strategy:
Staged Rollout:
Week 1: 10 beta users on staging
  → Monitor delivery rates, webhook reliability
  → Gather user feedback
  
Week 2: 50 users on production (AWS approved)
  → Monitor costs, error rates
  → Fine-tune rate limiting
  
Week 3: All existing users migrated
  → Full production deployment
  → Monitor for 48 hours
  
Week 4: Open to new registrations
  → Scale monitoring
Rollback Plan:
If AWS issues arise:
1. Pause new user onboarding
2. Revert to Twilio for critical messages (have code ready)
3. Debug AWS integration
4. Resume once stable
Success Criteria:

 Sandbox testing complete with 100% success rate
 CloudWatch monitoring configured
 AWS Support case approved
 10DLC registration approved
 Production credentials configured
 Rollout plan documented
 Rollback plan tested
 Team trained on new system


Cost Analysis
Current State (Twilio)
Phone Verification: $0.0079/SMS
Operational SMS: $0.0079/SMS
10DLC Registration: $4/month
Issues: 10DLC approval blocked

Monthly Cost (1000 users):
- 1000 verifications: $7.90
- 30,000 operational: $237.00
- 10DLC fee: $4.00
Total: $248.90/month
Future State (AWS + Twilio)
Phone Verification (Twilio): $0.0079/SMS
Operational SMS (AWS): $0.00645/SMS
10DLC Registration (AWS): ~$2/month

Monthly Cost (1000 users):
- 1000 verifications (Twilio): $7.90
- 30,000 operational (AWS): $193.50 (minus 100 free)
- 10DLC fee: $2.00
Total: $203.40/month

Savings: $45.50/month (18% reduction)

Break-Even Analysis

AWS sandbox is free for up to 10 verified numbers
Production breaks even after ~100 users
ROI improves significantly at scale due to lower per-message costs

Hidden Benefits

✅ No 10DLC approval delays (AWS reportedly faster)
✅ Better deliverability rates in some regions
✅ Integrated with AWS ecosystem (future features)
✅ More predictable pricing (fewer carrier surprises)


Risk Analysis & Mitigation
Risk 1: AWS 10DLC Approval Delays
Likelihood: Medium
Impact: High (blocks production launch)
Mitigation:

Start 10DLC registration immediately in Phase 1
Develop and test fully in sandbox during waiting period
Have Twilio fallback code ready (commented out)
Document approval process for future regions

Risk 2: Webhook Reliability on Railway
Likelihood: Low
Impact: High (users can't set budgets)
Mitigation:

Implement retry logic in webhook handler
Add dead letter queue (DLQ) for failed webhooks
Monitor webhook success rates with CloudWatch
Set up alerts for webhook failures > 5%
Test webhook under load (100+ concurrent messages)

Risk 3: AWS Rate Limiting
Likelihood: Low (after production approval)
Impact: Medium (some messages delayed)
Mitigation:

Implement exponential backoff for retries
Queue messages during high-volume periods
Spread daily SMS job across 30-minute window
Monitor rate limit errors in CloudWatch
Request higher throughput if needed

Risk 4: Message Delivery Failures
Likelihood: Medium (carrier issues)
Impact: Medium (user misses daily guidance)
Mitigation:

Mark all messages as TRANSACTIONAL for better delivery
Log all delivery failures with AWS message IDs
Implement retry logic (max 3 attempts, 5 min apart)
Send daily summary email as backup channel
Monitor delivery rate (target: >95%)

Risk 5: Increased Complexity (Two Providers)
Likelihood: High
Impact: Low (manageable with good architecture)
Mitigation:

Clear separation: Twilio = verification, AWS = operational
Comprehensive documentation (this document!)
Monitoring dashboards for both services
Standardized error handling across both
Regular code reviews to maintain separation

Risk 6: Cost Overruns
Likelihood: Low
Impact: Medium (budget exceeded)
Mitigation:

Set AWS spending limit to $100/month initially
CloudWatch alerts at 50%, 80%, 100% of budget
Monitor daily spending via AWS Cost Explorer
Review per-message costs monthly
Optimize message length to stay under 1 SMS segment (160 chars)


Testing Strategy
Phase 1: Unit Tests
typescript// Test SMS service
describe('AWSSMSService', () => {
  it('should send SMS successfully', async () => {
    const result = await smsService.sendMessage({
      to: '+12345678901',
      body: 'Test message',
      messageType: 'TRANSACTIONAL'
    });
    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  it('should handle invalid phone numbers', async () => {
    const result = await smsService.sendMessage({
      to: 'invalid',
      body: 'Test'
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid phone number');
  });

  it('should retry on throttling errors', async () => {
    // Mock throttling error
    // Verify retry logic
  });
});

// Test incoming message handler
describe('IncomingMessageHandler', () => {
  it('should parse budget amount from text', () => {
    expect(handler.extractBudgetAmount('2000')).toBe(2000);
    expect(handler.extractBudgetAmount('$2,000')).toBe(2000);
    expect(handler.extractBudgetAmount('Budget is 2000')).toBe(2000);
  });

  it('should update user budget', async () => {
    await handler.processIncomingMessage(mockSNSEvent);
    const user = await prisma.user.findUnique({ where: { id: 'test' }});
    expect(user.monthlyBudget).toBe(2000);
  });

  it('should send confirmation SMS', async () => {
    const spy = jest.spyOn(smsService, 'sendMessage');
    await handler.processIncomingMessage(mockSNSEvent);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining('$2,000')
      })
    );
  });
});
Phase 2: Integration Tests
typescriptdescribe('AWS Integration', () => {
  it('should send and receive message end-to-end', async () => {
    // Send message
    const sendResult = await smsService.sendMessage({
      to: process.env.TEST_PHONE_NUMBER,
      body: 'Integration test message'
    });
    expect(sendResult.success).toBe(true);

    // Wait for webhook
    await waitForWebhook(5000);

    // Verify webhook received
    expect(mockWebhookHandler).toHaveBeenCalled();
  });
});
Phase 3: Manual Testing Checklist
Sandbox Testing:

 Send SMS from AWS console to verified number
 Reply to message and verify webhook receives it
 Test welcome message after phone verification
 Test daily SMS job manually
 Test budget reply: "2000"
 Test budget reply: "$2,000"
 Test budget reply: "My budget is 2000"
 Test invalid reply: "hello" (should gracefully handle)
 Test reply from unregistered number (should reject)
 Test opt-out: reply "STOP"

Production Testing (After Approval):

 Send to 10 beta users
 Monitor delivery rates for 24 hours
 Check webhook success rate
 Verify cost per message matches expected
 Load test: 100 messages in 1 minute
 Test failover scenarios


Monitoring & Observability
Key Metrics to Track
1. Message Delivery Metrics
- Total messages sent (daily/monthly)
- Delivery success rate (target: >95%)
- Failed deliveries by error code
- Average delivery time
- Messages per user per day
2. Webhook Metrics
- Webhook success rate (target: >99%)
- Average webhook response time
- Failed webhooks by error type
- Duplicate message handling
- SNS subscription confirmations
3. Cost Metrics
- Daily SMS spend
- Cost per user per day
- Cost per message by type
- Month-to-date spending vs budget
- Cost trend over time
4. Business Metrics
- Users receiving daily SMS
- Users setting budgets (via reply)
- User engagement rate
- Opt-out rate
- Support tickets related to SMS
Logging Standards
typescript// Standard log format for SMS events
logger.info('sms_sent', {
  event: 'sms_sent',
  userId: user.id,
  phoneNumber: maskPhoneNumber(user.phoneNumber), // Last 4 digits only
  messageType: 'daily_guidance',
  messageId: result.messageId,
  provider: 'aws',
  cost: 0.00645,
  timestamp: new Date().toISOString()
});

logger.error('sms_failed', {
  event: 'sms_failed',
  userId: user.id,
  error: error.message,
  errorCode: error.code,
  retryable: error.retryable,
  retryCount: attempt,
  provider: 'aws',
  timestamp: new Date().toISOString()
});

logger.info('webhook_received', {
  event: 'webhook_received',
  messageId: snsMessage.MessageId,
  originationNumber: maskPhoneNumber(originationNumber),
  messageBody: messageBody.substring(0, 20), // First 20 chars only
  timestamp: new Date().toISOString()
});
Dashboard Setup
CloudWatch Dashboard:
json{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "title": "SMS Delivery Rate",
        "metrics": [
          ["AWS/SNS", "SMSSuccessRate"],
          [".", "SMSMonthToDateSpentUSD"]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-west-1"
      }
    },
    {
      "type": "log",
      "properties": {
        "title": "Recent Webhook Errors",
        "query": "fields @timestamp, userId, error | filter event = 'webhook_error' | sort @timestamp desc | limit 20"
      }
    }
  ]
}

Troubleshooting Guide
Common Issues & Solutions
Problem: SMS not received
Possible Causes:
1. Phone number not verified in sandbox
2. AWS spending limit reached ($1 in sandbox)
3. Invalid phone number format
4. Carrier blocking

Debug Steps:
1. Check CloudWatch logs for delivery status
2. Verify phone number in E.164 format (+1234567890)
3. Check AWS spending limit in console
4. Send test message from AWS console
5. Check user's carrier allows SMS from short codes

Solution:
- Add number to sandbox if testing
- Request production access if ready
- Format phone number correctly
- Contact carrier if blocking
Problem: Webhook not receiving replies
Possible Causes:
1. SNS subscription not confirmed
2. Railway endpoint not accessible
3. SNS signature verification failing
4. Two-way SMS not enabled on phone number

Debug Steps:
1. Check SNS subscription status in AWS console
2. Test Railway endpoint with curl
3. Check webhook logs for signature errors
4. Verify two-way SMS enabled in End User Messaging console

Solution:
- Confirm SNS subscription (check email)
- Ensure Railway service is running
- Fix signature verification code
- Enable two-way SMS in AWS console
Problem: High error rates
Possible Causes:
1. Rate limiting (sending too fast)
2. Invalid phone numbers in database
3. AWS service issues
4. Webhook timeout

Debug Steps:
1. Check CloudWatch for throttling errors
2. Validate phone numbers before sending
3. Check AWS service health dashboard
4. Increase webhook timeout limit

Solution:
- Implement rate limiting (100ms between sends)
- Clean up invalid phone numbers
- Wait for AWS service recovery
- Increase Railway timeout to 30s
Problem: Budget replies not updating database
Possible Causes:
1. Webhook not parsing message correctly
2. User not found in database
3. Database transaction failing
4. Confirmation SMS not sending

Debug Steps:
1. Check webhook logs for parsing errors
2. Verify phone number matches user record
3. Check database logs for errors
4. Test confirmation SMS separately

Solution:
- Fix budget parsing regex
- Normalize phone numbers (+1 prefix)
- Add transaction retry logic
- Handle confirmation errors gracefully

Migration Rollback Plan
If AWS migration fails, here's how to roll back:
Quick Rollback (< 1 hour)
Step 1: Revert Daily SMS to Twilio
typescript// apps/api/src/services/dailySmsService.ts
// Comment out AWS code
// const result = await this.awsSMSService.sendMessage({...});

// Uncomment Twilio code
const result = await this.messagingService.sendMessage({
  to: user.phoneNumber,
  body: message
});
Step 2: Revert Welcome Messages
typescript// apps/api/src/controllers/phoneVerificationController.ts
// Revert sendWelcomeSMS to use messagingService
const result = await this.messagingService.sendMessage({
  to: user.phoneNumber,
  body: message
});
Step 3: Deploy Rollback
bashgit revert HEAD~3  # Revert last 3 commits
git push origin main
# Railway auto-deploys
Step 4: Verify Rollback

 Send test welcome message (Twilio)
 Trigger daily SMS job (Twilio)
 Check logs for Twilio message SIDs
 Monitor for 1 hour

Full Rollback (If Needed)
Restore from Git Tag:
bashgit checkout pre-aws-migration
git push -f origin main
Environment Variables:
bash# Remove AWS vars
unset AWS_REGION
unset AWS_ACCESS_KEY_ID
unset AWS_SECRET_ACCESS_KEY
unset AWS_PHONE_NUMBER
unset AWS_SNS_TOPIC_ARN

# Ensure Twilio vars present
echo $TWILIO_PHONE_NUMBER  # Should be set
Database Cleanup:
sql-- If budget replies caused issues
UPDATE users 
SET monthly_budget = NULL 
WHERE updated_at > '2025-10-10';  -- Date of migration

Success Metrics
Phase Completion Criteria
Phase 1 Complete When:

 Can send SMS from AWS console to verified number
 Can receive reply and see in SNS topic
 Environment variables documented
 10DLC registration submitted

Phase 2 Complete When:

 All services have unit tests (>80% coverage)
 Can send SMS from Node.js code
 Error handling covers all AWS error codes
 Code review approved

Phase 3 Complete When:

 Welcome messages send via AWS
 Phone verification still uses Twilio
 All 3 message scenarios work correctly
 No errors in production logs for 24 hours

Phase 4 Complete When:

 Webhook receives messages successfully
 Budget updates work correctly
 Confirmation SMS sends back
 Security validation passes audit

Phase 5 Complete When:

 Daily SMS job runs successfully
 All messages delivered (>95% rate)
 Cost per message matches expected
 No performance degradation

Phase 6 Complete When:

 All files renamed and imports updated
 No obsolete code remaining
 Documentation complete
 Code passes linting and tests

Phase 7 Complete When:

 Production access approved
 10DLC registration complete
 Monitoring dashboards live
 100 users successfully migrated

Overall Migration Success Criteria
Technical:

✅ 95%+ message delivery rate
✅ <5% error rate
✅ 99%+ webhook reliability
✅ <100ms average response time
✅ Zero data loss
✅ Zero downtime during migration

Business:

✅ 18% cost reduction achieved
✅ No user complaints about SMS
✅ Support tickets unchanged or decreased
✅ User engagement maintained or improved
✅ Can scale to 10,000 users

Operational:

✅ Team trained on new system
✅ Documentation complete
✅ Monitoring in place
✅ On-call runbook created
✅ Rollback plan tested


Timeline Summary
PhaseDurationDependenciesDeliverablesPhase 1: AWS Setup1 dayNoneAWS account configured, sandbox workingPhase 2: Services2 daysPhase 1SMS service, webhook handler, testsPhase 3: Welcome1 dayPhase 2Welcome messages via AWSPhase 4: Webhook2 daysPhase 2, Phase 3Two-way SMS workingPhase 5: Daily SMS1 dayPhase 2Daily messages via AWSPhase 6: Cleanup1 dayPhase 3, 4, 5Code refactored, docs updatedPhase 7: Production2 days + waitAll aboveProduction readyTotal10 days + 1-2 weeks wait-Fully migrated system
Parallel Activities:

10DLC registration can happen during Phase 1-6 (waiting period)
Documentation can be written during any phase
Testing happens continuously throughout


Code Quality Checklist
Before merging each phase, ensure:
Code Style:

 TypeScript strict mode enabled
 No any types (use proper types or unknown)
 ESLint passes with zero warnings
 Prettier formatted
 No console.logs (use logger)

Architecture:

 Single Responsibility Principle followed
 Dependencies injected (not hardcoded)
 Services are stateless
 Error handling is comprehensive
 Logging includes context

Testing:

 Unit tests for all services
 Integration tests for critical paths
 Edge cases covered
 Error scenarios tested
 Test coverage >80%

Security:

 No secrets in code
 Input validation on all endpoints
 SNS signature verified
 Rate limiting implemented
 Phone numbers masked in logs

Documentation:

 JSDoc comments on public methods
 README updated
 Environment variables documented
 Architecture diagrams current
 Troubleshooting guide updated


Team Communication Plan
Stakeholder Updates
Weekly Update Format:
Week [N] Update - AWS SMS Migration

Progress:
- Completed: [Phase X]
- In Progress: [Phase Y]
- Blocked: [None/Issue]

Metrics:
- Messages sent: X,XXX
- Delivery rate: XX%
- Cost: $XX.XX
- Errors: X

Next Week:
- Complete [Phase Z]
- Begin [Phase A]

Risks:
- [Any concerns]
Communication Channels:

Daily: Slack updates in #engineering
Weekly: Email summary to stakeholders
Incidents: PagerDuty alerts + Slack
Major milestones: All-hands announcement

Launch Communication
Internal (1 week before):
Subject: AWS SMS Migration - Oct 17 Launch

Team,

We're migrating from Twilio to AWS for operational SMS on Oct 17.

What's changing:
- Users will see messages from new phone number: +1-XXX-XXX-XXXX
- No changes to verification flow
- Improved deliverability and lower costs

What to watch:
- Monitor #alerts channel for any issues
- Support team: escalate SMS issues immediately
- On-call engineer: [Name]

Questions? Reply here or ping me on Slack.
External (Users - if needed):
SMS: moony Update

We've upgraded our messaging system! You may see texts from a new 
number: +1-XXX-XXX-XXXX. Save this number - it's us! 

Your daily budget updates continue as usual. Reply HELP for support.

Post-Migration Actions
Week 1 After Launch

 Monitor delivery rates daily
 Review error logs twice daily
 Check webhook success rate
 Analyze cost per message
 Gather user feedback
 Update documentation with learnings

Week 2-4 After Launch

 Optimize message content for engagement
 Fine-tune rate limiting
 Review and optimize costs
 Plan for scale (10,000 users)
 Document lessons learned
 Train support team on new system

Month 2-3

 Request higher AWS limits if needed
 Implement advanced features (MMS, link tracking)
 A/B test message timing
 Expand to additional regions if needed
 Review security posture
 Conduct retrospective


Future Enhancements
After Successful Migration:
Short-term (1-3 months):

Rich Media: Add images to daily messages (MMS)
Personalization: ML-based message timing optimization
Analytics: Track message open/engagement rates
A/B Testing: Test different message formats

Medium-term (3-6 months):

Multi-language: Support Spanish, French
Voice: Add voice call option for urgent alerts
International: Expand to Canada, UK
Advanced Replies: Natural language processing for budget queries

Long-term (6-12 months):

AI Assistant: Conversational SMS bot
Predictive: "You're likely to overspend today"
Multi-channel: Email + SMS + Push notifications
White-label: SMS platform for other apps


Appendix
A. AWS SDK Installation
bashnpm install @aws-sdk/client-sns @aws-sdk/client-pinpoint-sms-voice-v2
B. TypeScript Types
typescript// types/aws.ts
export interface SendSMSParams {
  to: string;
  body: string;
  messageType?: 'TRANSACTIONAL' | 'PROMOTIONAL';
}

export interface SendSMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  retryable: boolean;
  cost?: number;
}

export interface IncomingSMSMessage {
  messageId: string;
  originationNumber: string;
  destinationNumber: string;
  messageBody: string;
  messageKeyword?: string;
  timestamp: string;
}

export interface SNSWebhookPayload {
  Type: 'SubscriptionConfirmation' | 'Notification';
  MessageId: string;
  TopicArn: string;
  Subject?: string;
  Message: string;
  Timestamp: string;
  SignatureVersion: string;
  Signature: string;
  SigningCertURL: string;
  SubscribeURL?: string;
}
C. Environment Variables Template
bash# .env.example

# --- AWS Configuration ---
AWS_REGION=us-west-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_PHONE_NUMBER=+12345678901
AWS_SNS_TOPIC_ARN=arn:aws:sns:us-west-1:123456789012:moony-incoming-sms

# --- Twilio Configuration (Verification Only) ---
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# --- Database ---
DATABASE_URL=postgresql://user:password@host:5432/database

# --- Application ---
NODE_ENV=staging
PORT=3000
API_URL=https://api-staging.railway.app
D. Useful AWS CLI Commands
bash# Send test SMS
aws pinpoint-sms-voice-v2 send-text-message \
  --destination-phone-number +12345678901 \
  --origination-identity +10987654321 \
  --message-body "Test message from AWS CLI"

# Check SMS delivery status
aws logs filter-log-events \
  --log-group-name sns/us-west-1/123456789012/DirectPublishToPhoneNumber \
  --filter-pattern "DELIVERED"

# List verified numbers in sandbox
aws pinpoint-sms-voice-v2 describe-phone-numbers

# Check spending limit
aws pinpoint-sms-voice-v2 describe-spend-limits

# Create SNS topic
aws sns create-topic --name moony-incoming-sms

# Subscribe webhook to topic
aws sns subscribe \
  --topic-arn arn:aws:sns:us-west-1:123456789012:moony-incoming-sms \
  --protocol https \
  --notification-endpoint https://api-staging.railway.app/api/webhooks/aws/incoming-sms
E. Example Webhook Payloads
Subscription Confirmation:
json{
  "Type": "SubscriptionConfirmation",
  "MessageId": "165545c9-2a5c-472c-8df2-7ff2be2b3b1b",
  "Token": "2336412f37fb...",
  "TopicArn": "arn:aws:sns:us-west-1:123456789012:moony-incoming-sms",
  "Message": "You have chosen to subscribe...",
  "SubscribeURL": "https://sns.us-west-1.amazonaws.com/?Action=ConfirmSubscription&TopicArn=...",
  "Timestamp": "2025-10-10T12:00:00.000Z",
  "SignatureVersion": "1",
  "Signature": "EXAMPLEpH+...",
  "SigningCertURL": "https://sns.us-west-1.amazonaws.com/..."
}
Incoming SMS:
json{
  "Type": "Notification",
  "MessageId": "da41e39f-ea4d-435a-b922-c6aae3915ebe",
  "TopicArn": "arn:aws:sns:us-west-1:123456789012:moony-incoming-sms",
  "Message": "{\"originationNumber\":\"+12345678901\",\"destinationNumber\":\"+10987654321\",\"messageKeyword\":\"BUDGET\",\"messageBody\":\"2000\",\"inboundMessageId\":\"...\",\"previousPublishedMessageId\":\"...\"}",
  "Timestamp": "2025-10-10T12:05:00.000Z",
  "SignatureVersion": "1",
  "Signature": "EXAMPLEpH+...",
  "SigningCertURL": "https://sns.us-west-1.amazonaws.com/..."
}

Quick Reference
Key URLs

AWS Console: https://console.aws.amazon.com
End User Messaging: https://console.aws.amazon.com/sms-voice/
SNS Console: https://console.aws.amazon.com/sns/
CloudWatch: https://console.aws.amazon.com/cloudwatch/
Cost Explorer: https://console.aws.amazon.com/cost-management/
Railway: https://railway.app

Support Contacts

AWS Support: https://console.aws.amazon.com/support/
Twilio Support: https://support.twilio.com
Railway Support: support@railway.app

Documentation

AWS End User Messaging: https://docs.aws.amazon.com/sms-voice/
AWS SNS: https://docs.aws.amazon.com/sns/
Twilio Verify: https://www.twilio.com/docs/verify


Document Version Control
Version 1.0 - October 10, 2025

Initial comprehensive migration plan
All 7 phases documented
Architecture, costs, risks analyzed
Testing and monitoring strategies defined

Next Review: After Phase 1 completion
