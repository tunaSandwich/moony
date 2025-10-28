# Changelog

All notable changes to the moony project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Complete AWS SMS integration for all operational messages
- Comprehensive AWS SMS testing suite with simulator numbers
- SMS configuration verification script (`verify:sms-config`)
- Complete SMS architecture documentation
- Two-way SMS support via AWS SNS webhooks
- Rate limiting for AWS sandbox mode (100ms delays)
- AWS message ID tracking in database

### Changed
- **BREAKING**: Migrated all operational SMS from Twilio to AWS End User Messaging
- DailySmsService now uses AWS SMS directly (no feature flag)
- WelcomeMessageService consolidated to AWS SMS only
- Twilio reserved exclusively for phone verification via Verify API
- Environment variable structure updated with clear AWS/Twilio separation
- Updated .env.example with detailed configuration guidance

### Removed
- `USE_AWS_SMS` feature flag completely removed from codebase
- Legacy Twilio SMS environment variables for operational messaging
- MessagingService removed from operational SMS flows (kept for interactive responses)
- All Twilio SMS sending code from operational services

### Fixed
- Message formatting consistency across AWS and Twilio
- Error handling for AWS-specific error types
- Proper cleanup in test scenarios
- Phone number masking in production logs

### Security
- AWS IAM permissions follow least-privilege principle
- Message content not logged in production environments
- Phone numbers properly masked in all logging
- No hardcoded credentials in codebase

### Documentation
- Added comprehensive SMS_ARCHITECTURE.md guide
- Updated README with AWS SMS configuration
- Created testing documentation for AWS integration
- Added troubleshooting guide for common issues

## [1.0.0] - 2025-10-28

### Phase 5: Complete AWS SMS Migration
- Completed 5-phase SMS migration project
- Removed feature flags and committed to AWS SMS architecture
- System ready for production deployment pending 10DLC approval

### Phase 4: Two-Way SMS Integration
- Implemented AWS SNS webhook handling for incoming messages
- Added budget setting via SMS replies
- Interactive message processing via AWS

### Phase 3: Daily SMS Migration  
- Migrated daily spending notifications to AWS SMS
- Implemented rate limiting and error handling
- Added comprehensive logging and monitoring

### Phase 2: Welcome Message Migration
- Migrated welcome messages to AWS SMS
- Added scenario-based messaging (full/partial/no data)
- Implemented budget confirmation messages

### Phase 1: AWS SMS Foundation
- Implemented AWSSMSService with full error handling
- Added sandbox mode support with simulator numbers
- Created comprehensive test suite for AWS integration
- Set up CloudWatch logging and monitoring

### Infrastructure
- AWS End User Messaging (SNS) integration
- Twilio Verify API for phone verification
- 10DLC registration and compliance setup
- Comprehensive testing and monitoring framework

---

## Migration Summary

This release completes the migration from Twilio-only SMS to a hybrid approach:

**Before**: All SMS via Twilio MessagingService
- Higher costs (~$0.0075/message for all types)
- Single point of failure
- Mixed verification and operational messages

**After**: Hybrid AWS + Twilio approach
- **AWS SMS**: Operational messages (welcome, daily, replies) - ~$0.0075/message
- **Twilio Verify**: Phone verification only - ~$0.05/verification
- Cost-optimized and compliance-ready
- Improved deliverability with 10DLC registration

## Production Deployment Notes

**Ready for deployment**: ✅ All code complete and tested
**Blocked by**: 10DLC registration approval (in progress)
**Required**: AWS production phone number provisioning

The system operates in AWS sandbox mode with simulator numbers until 10DLC approval.