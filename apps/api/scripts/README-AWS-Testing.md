# AWS SMS Testing Scripts

This directory contains comprehensive test scripts for verifying AWS SMS integration functionality.

## Available Test Scripts

### 1. `test-aws-basic.ts` - Basic Service Test
**Purpose**: Quick verification that AWS SMS service initializes correctly  
**Duration**: ~2-3 seconds  
**Creates data**: No  

```bash
NODE_ENV=local tsx apps/api/scripts/test-aws-basic.ts
```

**What it tests**:
- ✅ Environment variables loaded
- ✅ DailySmsService uses AWS (no Twilio)
- ✅ AWSSMSService initializes correctly
- ✅ All required methods available
- ✅ Message formatting works
- ✅ Sandbox mode configured for testing

### 2. `test-aws-daily-sms.ts` - Daily SMS Integration Test
**Purpose**: Full integration test with actual database operations  
**Duration**: ~5-10 seconds  
**Creates data**: Yes (auto-cleaned)

```bash
NODE_ENV=local tsx apps/api/scripts/test-aws-daily-sms.ts
```

**What it tests**:
- ✅ Creates test user with AWS simulator number
- ✅ Creates spending goal and analytics data
- ✅ Runs full daily SMS job
- ✅ Verifies message sent via AWS
- ✅ Calculates correct daily spending target
- ✅ Auto-cleans test data

### 3. `test-aws-integration.ts` - Comprehensive Integration Test
**Purpose**: Most thorough test with detailed verification  
**Duration**: ~10-15 seconds  
**Creates data**: Yes (auto-cleaned)

```bash
NODE_ENV=local tsx apps/api/scripts/test-aws-integration.ts
```

**What it tests**:
- ✅ Environment validation
- ✅ Test data creation and management
- ✅ Full daily SMS service execution
- ✅ Database verification of message IDs
- ✅ Daily target calculation verification
- ✅ Comprehensive cleanup with error handling

### 4. `test-daily-sms-simple.ts` - Legacy Simple Test
**Purpose**: Updated legacy test (AWS-only now)  
**Duration**: ~3-5 seconds  
**Creates data**: No

```bash
NODE_ENV=local tsx apps/api/scripts/test-daily-sms-simple.ts
```

## AWS Simulator Numbers

All test scripts use AWS-approved simulator numbers for safe testing:

### Destination Simulators (for receiving messages)
- `+14254147755` - Primary test destination
- `+14254147156` - Secondary test destination
- `+14254147266` - Additional option
- Additional simulators available in code

### Origination Simulators (for sending messages)
- `+12065559457` - Primary test sender
- `+12065559453` - Secondary test sender

## Environment Requirements

All test scripts require these environment variables:

```bash
# Required AWS Configuration
AWS_REGION=us-west-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_PHONE_NUMBER=+12065559457

# Sandbox Configuration (automatic in local)
AWS_SANDBOX_MODE=true
AWS_USE_SIMULATOR_OVERRIDE=true
AWS_SIMULATOR_DESTINATION=+14254147755

# Database
DATABASE_URL=your_database_url
```

## Test Output Examples

### Successful Test Output
```
🚀 Testing AWS Daily SMS Integration

📋 Environment Check:
   NODE_ENV: local
   AWS Region: us-west-1
   Sandbox Mode: Enabled

🔧 Step 1: Service Initialization
   ✅ DailySmsService with AWS initialized successfully
   ✅ sendDailyMessages method available
   ✅ disconnect method available

👤 Step 2: Creating Test User
   ✅ Created test user: Test User (+14254147755)

📊 Step 3: Creating Test Data
   ✅ Created spending goal: $2000/month
   ✅ Set current spending: $543

📱 Step 4: Running Daily SMS Job
   ✅ Daily SMS job completed!
   📊 Results: 2 sent, 0 failed, 1 skipped
   💰 Today's target calculated: $364
   📨 Message sent via AWS SMS Service

🎉 AWS SMS service is operational!
```

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   ```
   ❌ Missing required environment variables: AWS_REGION, AWS_ACCESS_KEY_ID
   ```
   **Solution**: Ensure `.env.local` has all required AWS variables

2. **Database Connection Error**
   ```
   ❌ PrismaClientInitializationError: Can't reach database server
   ```
   **Solution**: Check DATABASE_URL and ensure database is running

3. **AWS Credentials Error**
   ```
   ❌ The security token included in the request is invalid
   ```
   **Solution**: Verify AWS credentials are correct and active

### Test Data Cleanup

All integration tests automatically clean up their test data:
- Test users are deleted
- Spending goals are removed
- Analytics data is cleaned up
- Database connections are properly closed

If a test is interrupted, you can manually clean up:
```sql
DELETE FROM users WHERE invite_code LIKE 'TEST_%';
```

## Development Usage

### Running All Tests
```bash
# Quick verification
NODE_ENV=local tsx apps/api/scripts/test-aws-basic.ts

# Integration test
NODE_ENV=local tsx apps/api/scripts/test-aws-daily-sms.ts

# Comprehensive test
NODE_ENV=local tsx apps/api/scripts/test-aws-integration.ts
```

### CI/CD Integration
These scripts can be integrated into CI/CD pipelines:
```bash
# In pipeline
export NODE_ENV=staging
npm run test:aws-integration
```

## Security Notes

- All tests use AWS simulator numbers (safe for testing)
- No real SMS messages are sent
- Test data is automatically cleaned up
- Sandbox mode prevents accidental charges
- Real phone numbers are overridden in test environment

## Migration Status

✅ **Feature flag removed**: No more `USE_AWS_SMS` environment variable  
✅ **AWS-only**: All operational SMS uses AWS SNS  
✅ **Twilio reserved**: Only for phone verification and interactive responses  
✅ **Test coverage**: Comprehensive test suite available  
✅ **Production ready**: Ready for deployment with real AWS phone numbers