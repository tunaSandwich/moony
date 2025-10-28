#!/usr/bin/env node
/**
 * SMS Configuration Verification Script
 * 
 * This script verifies that:
 * 1. AWS SMS is properly configured for operational messages
 * 2. Twilio is ONLY used for phone verification
 * 3. No legacy SMS code remains in the codebase
 * 4. Environment variables are properly set
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import chalk from 'chalk';
import { promises as fs } from 'fs';
import path from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

interface ConfigCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  recommendation?: string;
}

class SMSConfigVerifier {
  private checks: ConfigCheck[] = [];

  async verify(): Promise<void> {
    console.log(chalk.blue.bold('\n🔍 SMS Configuration Verification\n'));
    console.log(chalk.gray('Verifying AWS/Twilio separation and configuration...\n'));

    try {
      // Environment checks
      await this.checkAWSConfiguration();
      await this.checkTwilioConfiguration();
      
      // Code quality checks
      await this.checkLegacyCode();
      await this.checkServiceUsage();
      
      // Final summary
      this.printSummary();
      
    } catch (error: any) {
      console.log(chalk.red(`\n❌ Verification failed: ${error.message}`));
      process.exit(1);
    }
  }

  private addCheck(check: ConfigCheck): void {
    this.checks.push(check);
  }

  private checkAWSConfiguration(): void {
    console.log(chalk.cyan('📱 AWS SMS Configuration (Operational Messages):'));

    // Check required AWS environment variables
    const requiredAWSVars = [
      { name: 'AWS_REGION', value: process.env.AWS_REGION },
      { name: 'AWS_ACCESS_KEY_ID', value: process.env.AWS_ACCESS_KEY_ID },
      { name: 'AWS_SECRET_ACCESS_KEY', value: process.env.AWS_SECRET_ACCESS_KEY },
      { name: 'AWS_PHONE_NUMBER', value: process.env.AWS_PHONE_NUMBER }
    ];

    requiredAWSVars.forEach(({ name, value }) => {
      if (value) {
        console.log(chalk.green(`   ✅ ${name}: Set`));
        this.addCheck({
          name: `${name} configured`,
          status: 'pass',
          message: `${name} is properly configured`
        });
      } else {
        console.log(chalk.red(`   ❌ ${name}: Not set`));
        this.addCheck({
          name: `${name} missing`,
          status: 'fail',
          message: `${name} is required for AWS SMS functionality`,
          recommendation: `Add ${name} to your .env.local file`
        });
      }
    });

    // Check optional AWS variables
    const optionalAWSVars = [
      { name: 'AWS_SNS_TOPIC_ARN', value: process.env.AWS_SNS_TOPIC_ARN },
      { name: 'AWS_SANDBOX_MODE', value: process.env.AWS_SANDBOX_MODE },
      { name: 'AWS_SIMULATOR_DESTINATION', value: process.env.AWS_SIMULATOR_DESTINATION }
    ];

    optionalAWSVars.forEach(({ name, value }) => {
      if (value) {
        console.log(chalk.green(`   ✅ ${name}: ${value}`));
      } else {
        console.log(chalk.yellow(`   ⚠️  ${name}: Not set (optional)`));
      }
    });

    console.log();
  }

  private checkTwilioConfiguration(): void {
    console.log(chalk.cyan('🔐 Twilio Configuration (Verification Only):'));

    // Check required Twilio Verify variables
    const requiredTwilioVars = [
      { name: 'TWILIO_ACCOUNT_SID', value: process.env.TWILIO_ACCOUNT_SID },
      { name: 'TWILIO_AUTH_TOKEN', value: process.env.TWILIO_AUTH_TOKEN },
      { name: 'TWILIO_VERIFY_SERVICE_SID', value: process.env.TWILIO_VERIFY_SERVICE_SID }
    ];

    requiredTwilioVars.forEach(({ name, value }) => {
      if (value) {
        console.log(chalk.green(`   ✅ ${name}: Set`));
        this.addCheck({
          name: `${name} configured`,
          status: 'pass',
          message: `${name} is properly configured for verification`
        });
      } else {
        console.log(chalk.red(`   ❌ ${name}: Not set`));
        this.addCheck({
          name: `${name} missing`,
          status: 'fail',
          message: `${name} is required for phone verification`,
          recommendation: `Add ${name} to your .env.local file`
        });
      }
    });

    // Check for deprecated Twilio SMS variables
    const deprecatedTwilioVars = [
      'TWILIO_PHONE_NUMBER',
      'TWILIO_WHATSAPP_FROM',
      'TWILIO_USE_WHATSAPP_FOR_TESTING',
      'TWILIO_TEST_MODE'
    ];

    deprecatedTwilioVars.forEach(varName => {
      if (process.env[varName]) {
        console.log(chalk.yellow(`   ⚠️  ${varName}: Found (should be removed)`));
        this.addCheck({
          name: `Legacy ${varName} found`,
          status: 'warn',
          message: `${varName} is no longer needed - operational SMS uses AWS`,
          recommendation: `Remove ${varName} from environment variables`
        });
      } else {
        console.log(chalk.green(`   ✅ ${varName}: Not found (correct)`));
      }
    });

    console.log();
  }

  private async checkLegacyCode(): Promise<void> {
    console.log(chalk.cyan('🔎 Legacy Code Check:'));

    try {
      // Check for USE_AWS_SMS references
      const useAwsSmsRefs = await this.searchFiles('USE_AWS_SMS', [
        'apps/api/src',
        'apps/scheduler',
        '.env*'
      ]);

      if (useAwsSmsRefs.length === 0) {
        console.log(chalk.green('   ✅ No USE_AWS_SMS feature flag references found'));
        this.addCheck({
          name: 'Feature flag removed',
          status: 'pass',
          message: 'All USE_AWS_SMS references have been cleaned up'
        });
      } else {
        console.log(chalk.red(`   ❌ Found ${useAwsSmsRefs.length} USE_AWS_SMS references:`));
        useAwsSmsRefs.forEach(ref => console.log(chalk.gray(`      ${ref}`)));
        this.addCheck({
          name: 'Legacy feature flag found',
          status: 'fail',
          message: 'USE_AWS_SMS references still exist in codebase',
          recommendation: 'Remove all USE_AWS_SMS references from code and configs'
        });
      }

      // Check for twilioClient.messages.create usage (excluding MessagingService which is used for interactive SMS)
      const twilioMessagesRefs = await this.searchFiles('twilioClient.messages.create', [
        'apps/api/src'
      ]);

      const problematicTwilioRefs = twilioMessagesRefs.filter(ref => 
        !ref.includes('messagingService.ts') // MessagingService is allowed for interactive SMS
      );

      if (problematicTwilioRefs.length === 0) {
        console.log(chalk.green('   ✅ No problematic Twilio SMS sending code found'));
        this.addCheck({
          name: 'Twilio SMS sending removed',
          status: 'pass',
          message: 'No Twilio SMS sending code detected in operational services'
        });
      } else {
        console.log(chalk.red(`   ❌ Found ${problematicTwilioRefs.length} problematic Twilio SMS references:`));
        problematicTwilioRefs.forEach(ref => console.log(chalk.gray(`      ${ref}`)));
        this.addCheck({
          name: 'Twilio SMS code found',
          status: 'fail',
          message: 'Twilio SMS sending code still exists in operational services',
          recommendation: 'Replace Twilio SMS with AWS SMS or remove if not needed'
        });
      }

      // Show MessagingService usage for transparency
      const messagingServiceRefs = twilioMessagesRefs.filter(ref => ref.includes('messagingService.ts'));
      if (messagingServiceRefs.length > 0) {
        console.log(chalk.green('   ✅ MessagingService uses Twilio (expected for interactive SMS)'));
      }

    } catch (error: any) {
      console.log(chalk.yellow(`   ⚠️  Could not check legacy code: ${error.message}`));
      this.addCheck({
        name: 'Legacy code check failed',
        status: 'warn',
        message: 'Unable to search for legacy code patterns',
        recommendation: 'Manually review code for USE_AWS_SMS and Twilio SMS usage'
      });
    }

    console.log();
  }

  private async checkServiceUsage(): Promise<void> {
    console.log(chalk.cyan('🔧 Service Usage Check:'));

    try {
      // Check that DailySmsService uses AWSSMSService
      const dailySmsContent = await this.readFileIfExists('apps/api/src/services/dailySmsService.ts');
      if (dailySmsContent) {
        if (dailySmsContent.includes('AWSSMSService') && !dailySmsContent.includes('MessagingService')) {
          console.log(chalk.green('   ✅ DailySmsService uses AWS SMS'));
          this.addCheck({
            name: 'DailySmsService AWS integration',
            status: 'pass',
            message: 'DailySmsService correctly uses AWSSMSService'
          });
        } else {
          console.log(chalk.red('   ❌ DailySmsService not properly configured for AWS'));
          this.addCheck({
            name: 'DailySmsService configuration',
            status: 'fail',
            message: 'DailySmsService should use AWSSMSService only',
            recommendation: 'Update DailySmsService to import and use AWSSMSService'
          });
        }
      }

      // Check that WelcomeMessageService uses AWSSMSService
      const welcomeContent = await this.readFileIfExists('apps/api/src/services/aws/welcomeMessageService.ts');
      if (welcomeContent) {
        if (welcomeContent.includes('AWSSMSService')) {
          console.log(chalk.green('   ✅ WelcomeMessageService uses AWS SMS'));
          this.addCheck({
            name: 'WelcomeMessageService AWS integration',
            status: 'pass',
            message: 'WelcomeMessageService correctly uses AWSSMSService'
          });
        } else {
          console.log(chalk.red('   ❌ WelcomeMessageService not configured for AWS'));
          this.addCheck({
            name: 'WelcomeMessageService configuration',
            status: 'fail',
            message: 'WelcomeMessageService should use AWSSMSService',
            recommendation: 'Update WelcomeMessageService to use AWSSMSService'
          });
        }
      }

      // Check that MessagingService is only used in appropriate places
      const messagingServiceRefs = await this.searchFiles('MessagingService', [
        'apps/api/src/services',
        'apps/api/src/controllers'
      ]);

      const allowedFiles = [
        'messagingService.ts',
        'webhookController.ts' // For interactive SMS responses
      ];

      const problematicRefs = messagingServiceRefs.filter(ref => 
        !allowedFiles.some(allowed => ref.includes(allowed))
      );

      if (problematicRefs.length === 0) {
        console.log(chalk.green('   ✅ MessagingService only used in appropriate places'));
        this.addCheck({
          name: 'MessagingService usage appropriate',
          status: 'pass',
          message: 'MessagingService is only used for interactive responses'
        });
      } else {
        console.log(chalk.yellow(`   ⚠️  MessagingService found in ${problematicRefs.length} unexpected places:`));
        problematicRefs.forEach(ref => console.log(chalk.gray(`      ${ref}`)));
        this.addCheck({
          name: 'MessagingService usage review needed',
          status: 'warn',
          message: 'MessagingService found in unexpected locations',
          recommendation: 'Review if these uses should be migrated to AWS SMS'
        });
      }

    } catch (error: any) {
      console.log(chalk.yellow(`   ⚠️  Could not check service usage: ${error.message}`));
      this.addCheck({
        name: 'Service usage check failed',
        status: 'warn',
        message: 'Unable to verify service implementations',
        recommendation: 'Manually review service files for correct AWS SMS usage'
      });
    }

    console.log();
  }

  private async searchFiles(pattern: string, directories: string[]): Promise<string[]> {
    const results: string[] = [];
    
    for (const dir of directories) {
      try {
        const files = await this.getAllFiles(dir);
        for (const file of files) {
          try {
            const content = await fs.readFile(file, 'utf-8');
            if (content.includes(pattern)) {
              results.push(file);
            }
          } catch (error) {
            // Skip files that can't be read
          }
        }
      } catch (error) {
        // Skip directories that don't exist
      }
    }
    
    return results;
  }

  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          files.push(...await this.getAllFiles(fullPath));
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js') || entry.name.startsWith('.env'))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
    
    return files;
  }

  private async readFileIfExists(filePath: string): Promise<string | null> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      return null;
    }
  }

  private printSummary(): void {
    console.log(chalk.cyan('📋 Verification Summary:\n'));

    const passed = this.checks.filter(c => c.status === 'pass').length;
    const warned = this.checks.filter(c => c.status === 'warn').length;
    const failed = this.checks.filter(c => c.status === 'fail').length;

    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ⚠️  Warnings: ${warned}`);
    console.log(`   ❌ Failed: ${failed}\n`);

    // Show failed checks
    const failedChecks = this.checks.filter(c => c.status === 'fail');
    if (failedChecks.length > 0) {
      console.log(chalk.red('❌ Failed Checks:'));
      failedChecks.forEach(check => {
        console.log(chalk.red(`   • ${check.message}`));
        if (check.recommendation) {
          console.log(chalk.gray(`     Recommendation: ${check.recommendation}`));
        }
      });
      console.log();
    }

    // Show warnings
    const warnedChecks = this.checks.filter(c => c.status === 'warn');
    if (warnedChecks.length > 0) {
      console.log(chalk.yellow('⚠️  Warnings:'));
      warnedChecks.forEach(check => {
        console.log(chalk.yellow(`   • ${check.message}`));
        if (check.recommendation) {
          console.log(chalk.gray(`     Recommendation: ${check.recommendation}`));
        }
      });
      console.log();
    }

    // Overall status
    if (failed === 0) {
      if (warned === 0) {
        console.log(chalk.green.bold('🎉 SMS Configuration Verification: PASSED'));
        console.log(chalk.green('All checks passed! Your SMS configuration is properly set up.'));
      } else {
        console.log(chalk.yellow.bold('⚠️  SMS Configuration Verification: PASSED WITH WARNINGS'));
        console.log(chalk.yellow('Configuration is functional but has some recommendations.'));
      }
    } else {
      console.log(chalk.red.bold('❌ SMS Configuration Verification: FAILED'));
      console.log(chalk.red(`${failed} critical issue(s) must be resolved before deployment.`));
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const verifier = new SMSConfigVerifier();
  await verifier.verify();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n🛑 Verification interrupted by user'));
  process.exit(1);
});

main().catch(error => {
  console.error(chalk.red('\n💥 Verification failed:'), error);
  process.exit(1);
});