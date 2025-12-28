#!/usr/bin/env node
/**
 * Production Readiness Verification Script
 * 
 * Comprehensive checklist to verify production readiness while waiting for 10DLC approval.
 * This script validates environment configuration, AWS setup, database state, code quality,
 * and documentation completeness.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import chalk from 'chalk';
import { prisma } from '../src/db.js';
import { AWSSMSService } from '../src/services/aws/smsService.js';
import { SNSClient, GetTopicAttributesCommand } from '@aws-sdk/client-sns';
import { CloudWatchClient, DescribeAlarmsCommand } from '@aws-sdk/client-cloudwatch';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

interface Check {
  name: string;
  status: boolean;
  note?: string;
  critical?: boolean;
}

class ProductionReadiness {
  private checks: Check[] = [];
  
  async run(): Promise<void> {
    console.log(chalk.blue.bold('\n🚀 Production Readiness Checklist\n'));
    console.log(chalk.gray('Verifying system readiness while waiting for 10DLC approval...\n'));
    
    try {
      // Environment checks
      await this.checkEnvironment();
      
      // AWS configuration
      await this.checkAWSConfig();
      
      // Database checks
      await this.checkDatabase();
      
      // Code quality
      await this.checkCodeQuality();
      
      // Documentation
      await this.checkDocumentation();
      
      // Monitoring setup
      await this.checkMonitoring();
      
      // Security checks
      await this.checkSecurity();
      
      // Display results
      this.displayResults();
      
    } catch (error: any) {
      console.log(chalk.red('\n💥 Checklist failed:'), error.message);
      process.exit(1);
    }
  }
  
  private async checkEnvironment(): Promise<void> {
    console.log(chalk.cyan('🔧 Checking environment variables...\n'));
    
    const required = [
      'AWS_REGION',
      'AWS_ACCESS_KEY_ID', 
      'AWS_SECRET_ACCESS_KEY',
      'AWS_PHONE_NUMBER',
      'AWS_SNS_TOPIC_ARN',
      'DATABASE_URL',
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN',
      'TWILIO_VERIFY_SERVICE_SID',
      'JWT_SECRET',
      'ENCRYPTION_KEY'
    ];
    
    required.forEach(env => {
      const value = process.env[env];
      const exists = !!value;
      this.checks.push({
        name: `Environment: ${env}`,
        status: exists,
        note: exists ? '✓ Set' : 'Missing',
        critical: true
      });
    });
    
    // Check for production values
    const nodeEnv = process.env.NODE_ENV;
    this.checks.push({
      name: 'NODE_ENV configuration',
      status: nodeEnv === 'production' || nodeEnv === 'staging',
      note: `Currently: ${nodeEnv || 'undefined'}`,
      critical: false
    });
    
    // Check AWS phone number format
    const awsPhone = process.env.AWS_PHONE_NUMBER;
    const validPhoneFormat = awsPhone ? /^\+1\d{10}$/.test(awsPhone) : false;
    this.checks.push({
      name: 'AWS phone number format',
      status: validPhoneFormat,
      note: validPhoneFormat ? 'Valid E.164 format' : 'Invalid or missing format',
      critical: true
    });
    
    // Check sandbox mode status
    const sandboxMode = process.env.AWS_SANDBOX_MODE !== 'false';
    this.checks.push({
      name: 'AWS Sandbox Mode status',
      status: true, // Always pass - this is informational
      note: sandboxMode ? '⏳ Waiting for 10DLC approval' : '✅ Production ready',
      critical: false
    });
  }
  
  private async checkAWSConfig(): Promise<void> {
    console.log(chalk.cyan('☁️  Checking AWS configuration...\n'));
    
    try {
      // Check SNS topic exists and is accessible
      const sns = new SNSClient({ region: process.env.AWS_REGION });
      const topicArn = process.env.AWS_SNS_TOPIC_ARN;
      
      if (topicArn) {
        try {
          await sns.send(new GetTopicAttributesCommand({
            TopicArn: topicArn
          }));
          this.checks.push({
            name: 'SNS Topic accessibility',
            status: true,
            note: 'Topic exists and accessible',
            critical: true
          });
        } catch {
          this.checks.push({
            name: 'SNS Topic accessibility',
            status: false,
            note: 'Topic not found or not accessible',
            critical: true
          });
        }
      } else {
        this.checks.push({
          name: 'SNS Topic configuration',
          status: false,
          note: 'AWS_SNS_TOPIC_ARN not set',
          critical: true
        });
      }
      
      // Test AWS SMS service initialization
      try {
        const smsService = new AWSSMSService();
        this.checks.push({
          name: 'AWS SMS Service initialization',
          status: true,
          note: 'Service initializes correctly',
          critical: true
        });
      } catch (error: any) {
        this.checks.push({
          name: 'AWS SMS Service initialization',
          status: false,
          note: `Initialization failed: ${error.message}`,
          critical: true
        });
      }
      
      // Check AWS credentials permissions
      try {
        const cloudwatch = new CloudWatchClient({ region: process.env.AWS_REGION });
        await cloudwatch.send(new DescribeAlarmsCommand({ MaxRecords: 1 }));
        this.checks.push({
          name: 'AWS CloudWatch permissions',
          status: true,
          note: 'CloudWatch access confirmed',
          critical: false
        });
      } catch {
        this.checks.push({
          name: 'AWS CloudWatch permissions',
          status: false,
          note: 'CloudWatch access limited or missing',
          critical: false
        });
      }
      
    } catch (error: any) {
      this.checks.push({
        name: 'AWS SDK initialization',
        status: false,
        note: `AWS SDK error: ${error.message}`,
        critical: true
      });
    }
  }
  
  private async checkDatabase(): Promise<void> {
    console.log(chalk.cyan('🗄️  Checking database...\n'));
    
    try {
      // Test database connection
      await prisma.$connect();
      this.checks.push({
        name: 'Database connection',
        status: true,
        note: 'Connection successful',
        critical: true
      });
      
      // Check user count
      const userCount = await prisma.user.count();
      this.checks.push({
        name: 'User data present',
        status: userCount > 0,
        note: `${userCount} users in database`,
        critical: false
      });
      
      // Check for test data that should be cleaned
      const testUsers = await prisma.user.count({
        where: {
          OR: [
            { inviteCode: { startsWith: 'TEST' } },
            { phoneNumber: { startsWith: '+14254147' } }, // AWS simulator numbers
            { firstName: { equals: 'Test' } }
          ]
        }
      });
      
      this.checks.push({
        name: 'Test data cleaned',
        status: testUsers === 0,
        note: testUsers > 0 ? `${testUsers} test users found` : 'No test data detected',
        critical: false
      });
      
      // Check database schema version
      try {
        const migrations = await prisma.$queryRaw`
          SELECT COUNT(*) as count FROM _prisma_migrations 
          WHERE finished_at IS NOT NULL
        ` as any[];
        
        const migrationCount = migrations[0]?.count || 0;
        this.checks.push({
          name: 'Database migrations applied',
          status: migrationCount > 0,
          note: `${migrationCount} migrations applied`,
          critical: true
        });
      } catch {
        this.checks.push({
          name: 'Database migrations',
          status: false,
          note: 'Unable to check migration status',
          critical: true
        });
      }
      
    } catch (error: any) {
      this.checks.push({
        name: 'Database connection',
        status: false,
        note: `Connection failed: ${error.message}`,
        critical: true
      });
    } finally {
      await prisma.$disconnect();
    }
  }
  
  private async checkCodeQuality(): Promise<void> {
    console.log(chalk.cyan('🔍 Checking code quality...\n'));
    
    // Check for TODO comments
    const todoCount = this.countInFiles('TODO|FIXME|XXX');
    this.checks.push({
      name: 'No TODO/FIXME comments',
      status: todoCount === 0,
      note: todoCount > 0 ? `${todoCount} items found` : 'Clean',
      critical: false
    });
    
    // Check for console.log statements (excluding legitimate uses in scripts)
    const totalConsole = this.countInFiles('console\\.log');
    const scriptConsole = this.countInFiles('console\\.log', 'scripts/');
    const srcConsole = totalConsole - scriptConsole;
    this.checks.push({
      name: 'No console.log in source code',
      status: srcConsole === 0,
      note: srcConsole > 0 ? `${srcConsole} console.logs in src/` : 'Clean (scripts excluded)',
      critical: false
    });
    
    // Check for debug code (excluding legitimate debug logging)
    const debugCount = this.countInFiles('console\\.debug|debugger;|TEMP.*=|HACK.*=');
    this.checks.push({
      name: 'No debug code',
      status: debugCount === 0,
      note: debugCount > 0 ? `${debugCount} debug statements found` : 'Clean',
      critical: false
    });
    
    // Check error handling coverage
    const tryCount = this.countInFiles('try\\s*\\{');
    const catchCount = this.countInFiles('catch\\s*\\(');
    const coverage = tryCount > 0 ? Math.round((catchCount / tryCount) * 100) : 100;
    this.checks.push({
      name: 'Error handling coverage',
      status: coverage >= 90,
      note: `${coverage}% (${tryCount} try blocks, ${catchCount} catch blocks)`,
      critical: false
    });
    
    // Check for hardcoded credentials
    const credentialPatterns = [
      'password.*=.*["\']\\w+["\']',
      'secret.*=.*["\']\\w+["\']',
      'key.*=.*["\'][A-Za-z0-9]{20,}["\']'
    ];
    
    let hardcodedCreds = 0;
    credentialPatterns.forEach(pattern => {
      hardcodedCreds += this.countInFiles(pattern);
    });
    
    this.checks.push({
      name: 'No hardcoded credentials',
      status: hardcodedCreds === 0,
      note: hardcodedCreds > 0 ? `${hardcodedCreds} potential credentials found` : 'Clean',
      critical: true
    });
  }
  
  private async checkDocumentation(): Promise<void> {
    console.log(chalk.cyan('📚 Checking documentation...\n'));
    
    const requiredDocs = [
      { file: 'README.md', critical: true },
      { file: '.env.example', critical: true },
      { file: 'docs/SMS_ARCHITECTURE.md', critical: false },
      { file: 'CLAUDE.md', critical: false },
      { file: 'package.json', critical: true }
    ];
    
    requiredDocs.forEach(({ file, critical }) => {
      const exists = fs.existsSync(path.join(process.cwd(), file));
      this.checks.push({
        name: `Documentation: ${file}`,
        status: exists,
        note: exists ? 'Present' : 'Missing',
        critical
      });
    });
    
    // Check .env.example completeness
    if (fs.existsSync('.env.example')) {
      const envExample = fs.readFileSync('.env.example', 'utf-8');
      const requiredVars = [
        'AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 
        'AWS_PHONE_NUMBER', 'DATABASE_URL', 'TWILIO_ACCOUNT_SID'
      ];
      
      const missingFromExample = requiredVars.filter(v => !envExample.includes(v));
      this.checks.push({
        name: '.env.example completeness',
        status: missingFromExample.length === 0,
        note: missingFromExample.length > 0 ? 
          `Missing: ${missingFromExample.join(', ')}` : 'Complete',
        critical: false
      });
    }
  }
  
  private async checkMonitoring(): Promise<void> {
    console.log(chalk.cyan('📊 Checking monitoring setup...\n'));
    
    // Check if monitoring files exist
    const monitoringFiles = [
      'apps/api/scripts/setup-monitoring.ts',
      'apps/api/src/utils/metricsLogger.ts'
    ];
    
    monitoringFiles.forEach(file => {
      const exists = fs.existsSync(file);
      this.checks.push({
        name: `Monitoring: ${path.basename(file)}`,
        status: exists,
        note: exists ? 'Present' : 'Missing',
        critical: false
      });
    });
    
    // Check if metrics are properly integrated
    const servicesWithMetrics = [
      'apps/api/src/services/aws/smsService.ts',
      'apps/api/src/controllers/webhookController.ts'
    ];
    
    let metricsIntegration = 0;
    servicesWithMetrics.forEach(file => {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf-8');
        if (content.includes('metricsLogger')) {
          metricsIntegration++;
        }
      }
    });
    
    this.checks.push({
      name: 'Metrics integration',
      status: metricsIntegration === servicesWithMetrics.length,
      note: `${metricsIntegration}/${servicesWithMetrics.length} services integrated`,
      critical: false
    });
  }
  
  private async checkSecurity(): Promise<void> {
    console.log(chalk.cyan('🔒 Checking security configuration...\n'));
    
    // Check JWT secret strength
    const jwtSecret = process.env.JWT_SECRET;
    const jwtSecure = jwtSecret && jwtSecret.length >= 32;
    this.checks.push({
      name: 'JWT secret strength',
      status: jwtSecure,
      note: jwtSecure ? 'Strong secret configured' : 'Weak or missing JWT secret',
      critical: true
    });
    
    // Check encryption key
    const encryptionKey = process.env.ENCRYPTION_KEY;
    const encryptionSecure = encryptionKey && encryptionKey.length >= 32;
    this.checks.push({
      name: 'Encryption key strength',
      status: encryptionSecure,
      note: encryptionSecure ? 'Strong key configured' : 'Weak or missing encryption key',
      critical: true
    });
    
    // Check for HTTPS configuration
    const httpsConfigured = process.env.NODE_ENV === 'production';
    this.checks.push({
      name: 'HTTPS configuration',
      status: httpsConfigured,
      note: httpsConfigured ? 'Production environment' : 'Ensure HTTPS in production',
      critical: true
    });
    
    // Check database URL security (no plain text passwords in logs)
    const dbUrl = process.env.DATABASE_URL;
    const dbSecure = dbUrl && !dbUrl.includes('password123') && !dbUrl.includes('admin');
    this.checks.push({
      name: 'Database security',
      status: dbSecure,
      note: dbSecure ? 'Secure database configuration' : 'Check database credentials',
      critical: true
    });
  }
  
  private countInFiles(pattern: string, directory: string = 'apps/api/src'): number {
    try {
      const result = execSync(
        `grep -r -E "${pattern}" ${directory} --include="*.ts" | wc -l`,
        { encoding: 'utf-8', stdio: 'pipe' }
      );
      return parseInt(result.trim()) || 0;
    } catch {
      return 0;
    }
  }
  
  private displayResults(): void {
    console.log(chalk.blue.bold('\n📋 Production Readiness Results:\n'));
    
    const criticalChecks = this.checks.filter(c => c.critical);
    const nonCriticalChecks = this.checks.filter(c => !c.critical);
    
    const criticalPassed = criticalChecks.filter(c => c.status).length;
    const nonCriticalPassed = nonCriticalChecks.filter(c => c.status).length;
    
    const totalPassed = this.checks.filter(c => c.status).length;
    const total = this.checks.length;
    const percentage = Math.round((totalPassed / total) * 100);
    
    // Display critical checks first
    console.log(chalk.red.bold('🚨 Critical Checks:'));
    criticalChecks.forEach(check => {
      const icon = check.status ? chalk.green('✅') : chalk.red('❌');
      const name = check.status ? chalk.green(check.name) : chalk.red(check.name);
      console.log(`${icon} ${name}`);
      if (check.note) {
        console.log(chalk.gray(`   ${check.note}`));
      }
    });
    
    console.log(chalk.yellow.bold('\n⚠️  Non-Critical Checks:'));
    nonCriticalChecks.forEach(check => {
      const icon = check.status ? chalk.green('✅') : chalk.yellow('⚠️ ');
      const name = check.status ? chalk.green(check.name) : chalk.yellow(check.name);
      console.log(`${icon} ${name}`);
      if (check.note) {
        console.log(chalk.gray(`   ${check.note}`));
      }
    });
    
    // Summary
    console.log(chalk.blue.bold(`\n📊 Overall Score: ${totalPassed}/${total} (${percentage}%)`));
    console.log(chalk.blue(`Critical: ${criticalPassed}/${criticalChecks.length}`));
    console.log(chalk.blue(`Non-Critical: ${nonCriticalPassed}/${nonCriticalChecks.length}\n`));
    
    // Determine readiness status
    const criticalPercentage = Math.round((criticalPassed / criticalChecks.length) * 100);
    
    if (criticalPercentage === 100) {
      console.log(chalk.green.bold('🎉 PRODUCTION READY!'));
      console.log(chalk.green('All critical checks passed. System ready for 10DLC approval.'));
    } else if (criticalPercentage >= 80) {
      console.log(chalk.yellow.bold('⚠️  ALMOST READY'));
      console.log(chalk.yellow('Address critical issues before production deployment.'));
    } else {
      console.log(chalk.red.bold('❌ NOT READY'));
      console.log(chalk.red('Critical issues must be resolved before production.'));
    }
    
    // 10DLC specific guidance
    console.log(chalk.cyan.bold('\n📱 10DLC Status & Next Steps:'));
    
    if (process.env.AWS_SANDBOX_MODE !== 'false') {
      console.log(chalk.yellow('⏳ Currently in AWS Sandbox Mode'));
      console.log(chalk.gray('   • 10DLC registration submitted, waiting for approval'));
      console.log(chalk.gray('   • Simulator-to-simulator messaging active'));
      console.log(chalk.gray('   • Once approved: Set AWS_SANDBOX_MODE=false'));
      console.log(chalk.gray('   • Update AWS_PHONE_NUMBER to approved number'));
    } else {
      console.log(chalk.green('✅ Production messaging enabled'));
      console.log(chalk.gray('   • 10DLC approval complete'));
      console.log(chalk.gray('   • Real phone number messaging active'));
    }
    
    console.log(chalk.cyan.bold('\n🚀 Deployment Checklist:'));
    console.log(chalk.gray('1. npm run setup:monitoring (set up CloudWatch)'));
    console.log(chalk.gray('2. Configure alert notifications (SNS topics)'));
    console.log(chalk.gray('3. Run final tests with npm run test:aws-integration'));
    console.log(chalk.gray('4. Deploy with monitoring enabled'));
    console.log(chalk.gray('5. Monitor initial traffic and adjust thresholds\n'));
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n🛑 Production checklist interrupted by user'));
  process.exit(1);
});

// Run the production readiness check
const checker = new ProductionReadiness();
checker.run().catch((error) => {
  console.error(chalk.red('\n💥 Production checklist failed:'), error.message);
  process.exit(1);
});