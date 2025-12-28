# SMS Architecture

## Overview

moony uses a hybrid SMS approach optimized for cost, deliverability, and compliance:

- **AWS End User Messaging**: All operational SMS (welcome, daily updates, budget replies)
- **Twilio Verify API**: Phone number verification only

This architecture separates transactional verification from operational messaging, providing the best of both platforms.

## Message Flow Architecture

```
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│   User Registration │    │   Operational SMS    │    │   Interactive SMS   │
│                     │    │                      │    │                     │
│  Phone Verification │───▶│  Welcome Messages    │───▶│  Budget Replies     │
│  (Twilio Verify)    │    │  Daily Updates       │    │  Two-way Messaging  │
│                     │    │  (AWS SNS)           │    │  (AWS SNS)          │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
```

## Message Types by Provider

### Via AWS End User Messaging (Operational Messages)

1. **Welcome Messages** 
   - Sent after phone verification completion
   - Personalized based on spending analytics
   - Three scenarios: full data, partial data, no data

2. **Daily Spending Updates**
   - Automated morning messages at 8 AM
   - Calculates today's spending target
   - Includes month-to-date progress

3. **Budget Confirmation Messages**
   - Sent when user sets new budget
   - Sent when user updates existing budget
   - Includes daily target calculation

4. **Interactive Replies**
   - Responses to user budget amount texts
   - Error messages for invalid inputs
   - Help and guidance messages

### Via Twilio Verify API (Verification Only)

1. **6-Digit Verification Codes**
   - Phone number confirmation during registration
   - Automatic retry and fallback handling
   - Rate limiting and fraud protection

## Technical Implementation

### AWS SNS Integration

```typescript
// Example: Daily SMS via AWS
const awsSmsService = new AWSSMSService();
const result = await awsSmsService.sendMessage({
  to: user.phoneNumber,
  body: dailyMessage,
  messageType: 'TRANSACTIONAL',
  userId: user.id
});
```

**Features:**
- Sandbox mode for local development
- Simulator-to-simulator messaging
- Message ID tracking in database
- Rate limiting (100ms between messages)
- Comprehensive error handling

### Twilio Verify Integration

```typescript
// Example: Phone verification via Twilio
const verifyService = twilioClient.verify.v2.services(VERIFY_SERVICE_SID);
const verification = await verifyService.verifications.create({
  to: phoneNumber,
  channel: 'sms'
});
```

**Features:**
- Automatic retry logic
- International number support
- Fraud detection
- Rate limiting protection

## Local Development & Testing

### AWS Sandbox Testing

```bash
# Test daily SMS with AWS
npm run test:aws-daily-sms

# Test comprehensive integration
npm run test:aws-integration

# Verify configuration
npm run verify:sms-config
```

**Simulator Numbers (Safe for Testing):**
- **Destination**: `+14254147755` (primary), `+14254147156` (secondary)
- **Origination**: `+12065559457` (primary), `+12065559453` (secondary)

### Environment Configuration

```bash
# Local development
AWS_SANDBOX_MODE=true
AWS_USE_SIMULATOR_OVERRIDE=true
AWS_SIMULATOR_DESTINATION=+14254147755

# Production
AWS_SANDBOX_MODE=false
AWS_PHONE_NUMBER=+1234567890  # Your 10DLC number
```

### Two-Way SMS Testing

1. **Outbound Testing:**
   ```bash
   NODE_ENV=local tsx apps/api/scripts/test-aws-daily-sms.ts
   ```

2. **Inbound Testing:**
   - Use AWS SNS webhook endpoint
   - Send test messages via AWS console
   - Check webhook logs for processing

## Production Deployment Checklist

### Pre-Production Requirements

- [ ] **10DLC Registration Approved**
  - Brand registration complete
  - Campaign registration approved
  - Phone number provisioned with 10DLC

- [ ] **AWS Configuration**
  - Production AWS account configured
  - IAM roles and permissions set
  - CloudWatch logging enabled
  - SNS topic created and configured

- [ ] **Infrastructure Setup**
  - Webhook endpoint deployed on Railway
  - SSL certificate configured
  - Database migrations applied
  - Environment variables configured

### Production Configuration

```bash
# Production environment variables
AWS_REGION=us-west-1
AWS_PHONE_NUMBER=+1234567890      # Your approved 10DLC number
AWS_SNS_TOPIC_ARN=arn:aws:sns:us-west-1:ACCOUNT:topic
AWS_SANDBOX_MODE=false
TWILIO_VERIFY_SERVICE_SID=VAxxxxx  # Production Verify service
```

### Monitoring & Alerts

1. **AWS CloudWatch Metrics:**
   - SMS delivery rates (target: >95%)
   - Error rates and types
   - Cost per message
   - API latency

2. **Application Metrics:**
   - Daily message success/failure rates
   - User opt-out rates
   - Webhook processing times
   - Database query performance

3. **Twilio Console Metrics:**
   - Verification success rates
   - Verification attempt volumes
   - Geographic distribution

## Cost Analysis

### AWS End User Messaging Costs

- **Transactional SMS**: ~$0.0075 per message
- **Promotional SMS**: ~$0.0045 per message
- **10DLC Registration**: One-time $15 + monthly fees

### Twilio Verify Costs

- **SMS Verification**: ~$0.05 per verification attempt
- **Voice Verification**: ~$0.04 per attempt (fallback)

### Expected Monthly Costs (1000 active users)

```
Daily SMS (30 days × 1000 users): $225/month
Welcome Messages (100 new users): $0.75/month
Phone Verifications (100 new users): $5/month
Total Estimated: ~$231/month
```

## Security & Compliance

### Data Protection

- Phone numbers encrypted at rest
- Message content not logged in production
- AWS IAM roles with minimal permissions
- Rate limiting to prevent abuse

### Regulatory Compliance

- **10DLC Compliance**: All operational SMS uses registered brand/campaign
- **TCPA Compliance**: Users can opt-out via "STOP" keyword
- **CAN-SPAM**: Transactional messages only, no promotional content
- **International**: Twilio Verify handles country-specific regulations

## Troubleshooting

### Common Issues

1. **AWS SMS Not Sending**
   ```
   Check: AWS credentials, sandbox mode, phone number format
   Logs: CloudWatch Logs for detailed error messages
   ```

2. **Twilio Verification Failing**
   ```
   Check: Verify service SID, account balance, phone number validity
   Logs: Twilio console for delivery attempts
   ```

3. **Webhook Not Receiving Messages**
   ```
   Check: SNS topic configuration, webhook URL, SSL certificate
   Test: Send test message via AWS console
   ```

### Debug Commands

```bash
# Test AWS configuration
NODE_ENV=local tsx apps/api/scripts/test-aws-basic.ts

# Test Twilio verification
NODE_ENV=local tsx apps/api/scripts/test-twilio-verify.ts

# Check environment configuration
npm run verify:sms-config

# Test webhook endpoint
curl -X POST https://your-app.railway.app/api/webhooks/sms \
  -H "Content-Type: application/json" \
  -d '{"test": "message"}'
```

## Migration History

### Phase 1-4: Twilio SMS (Legacy)
- All SMS via Twilio MessagingService
- Mixed verification and operational messages
- Higher costs, single point of failure

### Phase 5: AWS Hybrid (Current)
- Operational SMS migrated to AWS
- Twilio exclusively for verification
- Cost optimized, improved deliverability
- Feature flag removed, AWS always used

### Future Considerations

- **International Expansion**: AWS SNS supports global messaging
- **Rich Messaging**: RCS support via AWS in select regions
- **Analytics**: Enhanced delivery insights via AWS CloudWatch
- **Cost Optimization**: Promotional vs transactional message routing

## Developer Resources

### API Documentation
- [AWS SNS API Reference](https://docs.aws.amazon.com/sns/)
- [Twilio Verify API Reference](https://www.twilio.com/docs/verify/api)

### Code Examples
- `apps/api/src/services/aws/smsService.ts` - AWS SMS implementation
- `apps/api/src/services/messagingService.ts` - Twilio implementation
- `apps/api/scripts/test-*.ts` - Testing utilities

### Support Contacts
- **AWS Support**: Enterprise support plan active
- **Twilio Support**: Console-based support available
- **10DLC Issues**: Contact AWS SNS support team