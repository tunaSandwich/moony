#!/bin/bash

# Production Deployment Script
# This script handles production deployment with comprehensive checks and safety measures

set -e  # Exit on any error

echo "🚀 Moony Production Deployment Script"
echo "====================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    print_error "Railway CLI not found. Please install it first:"
    echo "npm install -g @railway/cli"
    exit 1
fi

# Check if logged into Railway
if ! railway whoami &> /dev/null; then
    print_error "Not logged into Railway. Please run: railway login"
    exit 1
fi

print_success "Railway CLI ready"

# Check current git status
if [ -n "$(git status --porcelain)" ]; then
    print_warning "Working directory has uncommitted changes"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Deployment cancelled"
        exit 1
    fi
fi

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
    print_warning "Not on main/master branch (currently on: $CURRENT_BRANCH)"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Deployment cancelled"
        exit 1
    fi
fi

# Check 10DLC status
print_status "Checking 10DLC approval status..."
if [ "${AWS_SANDBOX_MODE:-true}" = "true" ]; then
    print_warning "Still in AWS Sandbox mode - 10DLC approval pending"
    echo "This deployment will use simulator numbers only."
    echo "Real SMS messaging will not work until 10DLC is approved."
    echo ""
    read -p "Continue with sandbox deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Deployment cancelled"
        exit 1
    fi
else
    print_success "AWS Sandbox mode disabled - 10DLC approved"
fi

# Run production readiness check
print_status "Running production readiness check..."
if npm run check:production > /dev/null 2>&1; then
    print_success "Production checklist passed"
else
    print_error "Production checklist failed"
    echo ""
    echo "Run 'npm run check:production' to see detailed results"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Deployment cancelled - fix issues first"
        exit 1
    fi
fi

# Test AWS connection
print_status "Testing AWS connectivity..."
if ! node -e "
const { SNSClient, GetTopicAttributesCommand } = require('@aws-sdk/client-sns');
const sns = new SNSClient({ region: process.env.AWS_REGION });
sns.send(new GetTopicAttributesCommand({ TopicArn: process.env.AWS_SNS_TOPIC_ARN }))
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
" > /dev/null 2>&1; then
    print_warning "AWS connection test failed"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Deployment cancelled"
        exit 1
    fi
else
    print_success "AWS connectivity confirmed"
fi

# Create database backup (if DATABASE_URL is available)
if [ -n "$DATABASE_URL" ]; then
    print_status "Creating database backup..."
    BACKUP_FILE="backup-$(date +%Y%m%d-%H%M%S).sql"
    
    if command -v pg_dump &> /dev/null; then
        if pg_dump "$DATABASE_URL" > "$BACKUP_FILE" 2>/dev/null; then
            print_success "Database backup created: $BACKUP_FILE"
        else
            print_warning "Database backup failed (continuing anyway)"
        fi
    else
        print_warning "pg_dump not found - skipping database backup"
    fi
else
    print_warning "DATABASE_URL not set - skipping backup"
fi

# Build the project
print_status "Building project..."
if npm run build > /dev/null 2>&1; then
    print_success "Build completed successfully"
else
    print_error "Build failed"
    exit 1
fi

# Run tests if available
if npm run test > /dev/null 2>&1; then
    print_success "Tests passed"
elif [ $? -eq 127 ]; then
    print_warning "No test script found - skipping tests"
else
    print_error "Tests failed"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Deployment cancelled"
        exit 1
    fi
fi

# Final confirmation
echo ""
print_warning "FINAL CONFIRMATION"
echo "About to deploy to Railway production environment"
echo "Branch: $CURRENT_BRANCH"
echo "10DLC Status: $([ "${AWS_SANDBOX_MODE:-true}" = "true" ] && echo "Sandbox Mode" || echo "Production Ready")"
echo ""
read -p "Proceed with deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_error "Deployment cancelled by user"
    exit 1
fi

# Deploy to Railway
print_status "Deploying to Railway production environment..."
echo ""

if railway up --environment production; then
    print_success "Railway deployment completed successfully!"
else
    print_error "Railway deployment failed"
    exit 1
fi

# Wait for deployment to be ready
print_status "Waiting for deployment to be ready..."
sleep 10

# Check health endpoint
RAILWAY_URL=$(railway status --json | grep -o '"url":"[^"]*' | cut -d'"' -f4)
if [ -n "$RAILWAY_URL" ]; then
    if curl -f -s "$RAILWAY_URL/api/health" > /dev/null; then
        print_success "Health check passed - deployment is live!"
    else
        print_warning "Health check failed - service may still be starting"
    fi
else
    print_warning "Could not determine deployment URL"
fi

echo ""
print_success "🎉 Deployment Complete!"
echo ""
echo "📋 Post-Deployment Checklist:"
echo "================================"
echo ""
echo "1. 📊 Check CloudWatch Metrics"
echo "   → Log into AWS Console and verify SMS delivery metrics"
echo "   → Dashboard: https://console.aws.amazon.com/cloudwatch/"
echo ""
echo "2. 📱 Test SMS Functionality"
if [ "${AWS_SANDBOX_MODE:-true}" = "true" ]; then
    echo "   → Send test to simulator number: +14254147755"
    echo "   → Verify webhook receives messages"
else
    echo "   → Send test SMS to verified production number"
    echo "   → Test webhook with real phone number"
fi
echo ""
echo "3. 🔍 Monitor Error Logs"
echo "   → Railway: railway logs --tail"
echo "   → Watch for errors in first 30 minutes"
echo ""
echo "4. 🚨 Emergency Procedures"
echo "   → Pause SMS: npm run rollback:pause"
echo "   → Resume SMS: npm run rollback:resume"
echo "   → Rollback: railway rollback"
echo ""
if [ "${AWS_SANDBOX_MODE:-true}" = "true" ]; then
    echo "5. 📞 After 10DLC Approval"
    echo "   → Update AWS_PHONE_NUMBER in Railway environment"
    echo "   → Set AWS_SANDBOX_MODE=false"
    echo "   → Run: npm run deploy:production again"
    echo ""
fi

print_status "Monitor your deployment closely for the next 30 minutes!"
echo ""

# Open monitoring dashboards
if command -v open &> /dev/null; then
    read -p "Open monitoring dashboards? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open "https://console.aws.amazon.com/cloudwatch/"
        railway dashboard
    fi
fi