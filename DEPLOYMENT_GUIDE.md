# 🚀 Production Deployment Guide

This guide covers deploying Moony to production on Railway while waiting for 10DLC approval.

## 📋 Pre-Deployment Checklist

### 1. Environment Setup
```bash
# Copy production environment template
cp .env.production.template .env.production

# Update with your actual values:
# - AWS credentials and phone number
# - Database connection string
# - Twilio credentials for verification
# - JWT and encryption secrets
```

### 2. Run Production Readiness Check
```bash
npm run check:production
```
**Required**: All critical checks must pass before deployment.

### 3. Test AWS SMS Configuration
```bash
npm run test:aws-integration
npm run verify:sms-config
```

### 4. Set Up Monitoring
```bash
npm run setup:monitoring
```

## 🚂 Railway Deployment

### Initial Setup
1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Link to Railway Project**
   ```bash
   railway link
   ```

3. **Set Environment Variables**
   ```bash
   # Set production environment variables in Railway dashboard
   # Or use CLI:
   railway variables set KEY=value
   ```

### Staging Deployment (Recommended First)
```bash
npm run deploy:staging
```

### Production Deployment
```bash
npm run deploy:production
```

This script will:
- ✅ Check 10DLC status
- ✅ Run production readiness verification
- ✅ Test AWS connectivity
- ✅ Create database backup
- ✅ Build and test the application
- ✅ Deploy to Railway
- ✅ Verify health endpoints
- ✅ Provide post-deployment checklist

## 🔄 10DLC Status Management

### Before 10DLC Approval (Current State)
```bash
# Environment variables
AWS_SANDBOX_MODE=true
AWS_PHONE_NUMBER=+12065559457  # Simulator number

# Capabilities
✅ Phone verification (Twilio Verify)
✅ Webhook message processing 
✅ Database operations
✅ Monitoring and metrics
⏳ SMS to simulator numbers only
❌ SMS to real phone numbers
```

### After 10DLC Approval
```bash
# Update environment variables
AWS_SANDBOX_MODE=false
AWS_PHONE_NUMBER=+1YOURNEWNUMBER

# Re-deploy
npm run deploy:production
```

## 🚨 Emergency Procedures

### Emergency SMS Pause
```bash
npm run rollback:pause "Reason for emergency"
```
**Use cases**: AWS failures, unexpected costs, security issues

### Resume SMS Operations
```bash
npm run rollback:resume "Emergency resolved"
```

### Twilio Fallback (If Needed)
The system includes automatic Twilio fallback for emergencies. Configure:
```bash
TWILIO_PHONE_NUMBER_BACKUP=+1BACKUPNUMBER
```

### Railway Rollback
```bash
railway rollback
```

## 📊 Post-Deployment Monitoring

### 1. Health Checks
- **URL**: `https://your-app.railway.app/api/health`
- **Expected**: HTTP 200 with healthy status
- **Monitors**: Database, AWS SMS, Environment, Plaid

### 2. CloudWatch Metrics
- **Dashboard**: AWS Console → CloudWatch → Dashboards → `moony-sms-monitoring`
- **Key Metrics**: Delivery rates, costs, error rates, latency

### 3. Application Logs
```bash
railway logs --tail
```

### 4. Test SMS Functionality
```bash
# Send test message to simulator (before 10DLC)
curl -X POST https://your-app.railway.app/api/test-sms

# Check webhook processing
# Send SMS to your webhook URL and verify processing
```

## 🔧 Troubleshooting

### Common Issues

**Health Check Failing**
```bash
# Check service status
curl https://your-app.railway.app/api/health

# Verify environment variables
railway variables

# Check logs
railway logs
```

**SMS Not Sending**
```bash
# Check AWS sandbox status
echo $AWS_SANDBOX_MODE

# Verify simulator numbers
# +12065559457 (origination)
# +14254147755 (destination)

# Test AWS connectivity
npm run test:aws-basic
```

**Database Connection Issues**
```bash
# Verify DATABASE_URL format
# Should be: postgresql://user:pass@host:port/db

# Test connection
npm run db:status
```

**Webhook Not Receiving Messages**
```bash
# Verify webhook URL in Twilio console
# Format: https://your-app.railway.app/api/webhooks/sms

# Check request logs
railway logs --filter "webhook"
```

### Error Recovery

**Service Completely Down**
1. Check Railway dashboard for service status
2. Review recent deployments and changes
3. Check resource usage (CPU, memory)
4. Roll back to last known good deployment

**SMS System Issues**
1. Pause SMS operations: `npm run rollback:pause`
2. Investigate issue (AWS status, credentials, etc.)
3. Test fix with `npm run test:aws-basic`
4. Resume operations: `npm run rollback:resume`

**Database Issues**
1. Check connection string and credentials
2. Verify database server status
3. Check for migration issues
4. Restore from backup if necessary

## 📈 Scaling Considerations

### Traffic Growth
- **Database**: Consider connection pooling
- **Railway**: Monitor resource usage and upgrade plan
- **AWS SMS**: Watch costs and delivery rates

### Feature Additions
- **New endpoints**: Update health checks
- **New services**: Add to monitoring setup
- **Database changes**: Run migrations carefully

## 🔐 Security Best Practices

### Production Secrets
- ✅ Use Railway's secure environment variables
- ✅ Rotate secrets regularly
- ✅ Monitor for leaked credentials
- ❌ Never commit secrets to git

### Access Control
- ✅ Limit Railway project access
- ✅ Use principle of least privilege
- ✅ Monitor admin actions
- ✅ Regular access reviews

### Monitoring
- ✅ Set up error tracking
- ✅ Monitor for unusual patterns
- ✅ Alert on security events
- ✅ Regular security updates

## 📞 Support Contacts

### 10DLC Approval Process
- **Provider**: AWS/Carrier
- **Timeline**: 1-2 weeks typically
- **Status**: Check AWS Console → Pinpoint → Phone Numbers

### Emergency Contacts
- **Technical Issues**: Your team lead
- **AWS Support**: Your AWS support plan
- **Railway Support**: Railway dashboard → Help
- **Security Issues**: Your security team

---

## 🎯 Success Criteria

**Deployment Successful When:**
- ✅ Health endpoint returns 200 OK
- ✅ All critical services healthy
- ✅ SMS simulator testing works
- ✅ Webhook processing confirmed
- ✅ Monitoring dashboards active
- ✅ Error logs clean for 30 minutes

**10DLC Ready When:**
- ✅ Phone number approved by carrier
- ✅ AWS sandbox mode disabled
- ✅ Real phone number testing successful
- ✅ Cost monitoring configured
- ✅ Production traffic validated

**Emergency Procedures Tested:**
- ✅ SMS pause/resume verified
- ✅ Twilio fallback configured
- ✅ Railway rollback tested
- ✅ Monitoring alerts confirmed
- ✅ Team response procedures documented

---

*This deployment guide ensures a safe, monitored production deployment while maintaining flexibility for 10DLC approval timing.*