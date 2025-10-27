import { AWSSMSService } from './smsService.js';
import { prisma } from '../../db.js';
import { PlaidAnalyticsService } from '../plaidAnalyticsService.js';
import { TemplateService } from '../templateService.js';
import { WELCOME_TEMPLATES, BUDGET_TEMPLATES, ERROR_TEMPLATES } from '../../templates/smsTemplates.js';
import { logger } from 'packages/utils/logger.js';
import { format, subMonths } from 'date-fns';

type UserWithAnalytics = {
  firstName?: string | null;
  phoneNumber: string;
  phoneVerified?: boolean;
  plaidItemId?: string | null;
  spendingAnalytics?: {
    averageMonthlySpending?: any;
    lastMonthSpending?: any;
    twoMonthsAgoSpending?: any;
    currentMonthSpending?: any;
  } | null;
};

export interface WelcomeMessageOptions {
  isReconnection?: boolean;
  triggerAnalytics?: boolean;
  forceScenario?: 'A' | 'B' | 'C';
}

export interface WelcomeMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  scenario: 'A' | 'B' | 'C' | 'reconnection';
  sandboxLimited?: boolean;
}

export class WelcomeMessageService {
  private smsService: AWSSMSService;
  private analyticsService: PlaidAnalyticsService;
  
  constructor() {
    this.smsService = new AWSSMSService();
    this.analyticsService = new PlaidAnalyticsService();
  }
  
  /**
   * Send welcome message to newly verified user
   */
  async sendWelcomeMessage(
    userId: string, 
    options: WelcomeMessageOptions = {}
  ): Promise<WelcomeMessageResult> {
    try {
      logger.info('Preparing welcome message', { userId, options });
      
      // Fetch user data with analytics
      let user = (await prisma.user.findUnique({
        where: { id: userId },
        select: ({ 
          firstName: true,
          phoneNumber: true,
          phoneVerified: true,
          plaidItemId: true,
          spendingAnalytics: {
            select: {
              averageMonthlySpending: true,
              lastMonthSpending: true,
              twoMonthsAgoSpending: true,
              currentMonthSpending: true
            }
          }
        } as any)
      })) as UserWithAnalytics | null;
      
      if (!user || !user.phoneNumber) {
        logger.error('User not found or missing phone number', { userId });
        return {
          success: false,
          error: 'User not found',
          scenario: 'C'
        };
      }
      
      // Check if this is a simulator number in sandbox mode
      const isSandboxMode = process.env.AWS_SANDBOX_MODE !== 'false';
      const useSimulatorOverride = process.env.AWS_USE_SIMULATOR_OVERRIDE === 'true';
      const isSimulator = this.isSimulatorNumber(user.phoneNumber);
      
      if (isSandboxMode) {
        logger.info('AWS sandbox mode active', {
          userId,
          isSimulatorNumber: isSimulator,
          useSimulatorOverride,
          originalNumber: this.maskPhoneNumber(user.phoneNumber)
        });
        
        if (useSimulatorOverride && !isSimulator) {
          logger.info('Real number will be overridden with simulator in sandbox', {
            userId,
            originalNumber: this.maskPhoneNumber(user.phoneNumber),
            simulatorDestination: process.env.AWS_SIMULATOR_DESTINATION
          });
        }
      }
      
      // Handle reconnection scenario
      if (options.isReconnection) {
        return await this.sendReconnectionMessage(user);
      }
      
      // Trigger analytics if needed and Plaid is connected
      if (options.triggerAnalytics && user.plaidItemId) {
        try {
          await this.analyticsService.processUserAnalytics(userId);
          // Refetch user with updated analytics
          const updatedUser = (await prisma.user.findUnique({
            where: { id: userId },
            select: ({ 
              spendingAnalytics: {
                select: {
                  averageMonthlySpending: true,
                  lastMonthSpending: true,
                  twoMonthsAgoSpending: true,
                  currentMonthSpending: true
                }
              }
            } as any)
          })) as UserWithAnalytics | null;
          if (updatedUser?.spendingAnalytics) {
            (user as UserWithAnalytics).spendingAnalytics = updatedUser.spendingAnalytics;
          }
        } catch (error: any) {
          logger.error('Failed to calculate analytics', { userId, error: error.message });
          // Continue with welcome message even if analytics fails
        }
      }
      
      // Determine scenario and build message
      const scenario = this.determineScenario(user.spendingAnalytics, options.forceScenario);
      const message = this.buildWelcomeMessage(user, scenario);
      
      // Send via AWS
      const result = await this.smsService.sendMessage({
        to: user.phoneNumber,
        body: message,
        messageType: 'TRANSACTIONAL',
        userId: userId
      });
      
      if (result.success && result.messageId) {
        logger.info('Welcome message sent successfully', {
          userId,
          scenario,
          messageId: result.messageId
        });
      }
      
      return {
        success: result.success,
        messageId: result.messageId,
        error: result.error,
        scenario,
        sandboxLimited: result.sandboxSkipped
      };
      
    } catch (error: any) {
      logger.error('Failed to send welcome message', {
        userId,
        error: error.message
      });
      return {
        success: false,
        error: error.message,
        scenario: 'C'
      };
    }
  }
  
  /**
   * Send reconnection message for users reconnecting Plaid
   */
  private async sendReconnectionMessage(user: any): Promise<WelcomeMessageResult> {
    const now = new Date();
    const currentMonthName = format(now, 'MMMM');
    const currentSpending = user.spendingAnalytics?.currentMonthSpending || 0;
    
    const message = TemplateService.render(WELCOME_TEMPLATES.RECONNECTED.template, {
      currentMonthName,
      currentMonthAmount: TemplateService.formatCurrency(currentSpending)
    });
    
    const result = await this.smsService.sendMessage({
      to: user.phoneNumber,
      body: message,
      messageType: 'TRANSACTIONAL'
    });
    
    return {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      scenario: 'reconnection',
      sandboxLimited: result.sandboxSkipped
    };
  }
  
  /**
   * Determine which welcome scenario to use
   */
  private determineScenario(
    analytics: any, 
    forceScenario?: 'A' | 'B' | 'C'
  ): 'A' | 'B' | 'C' {
    if (forceScenario) return forceScenario;
    
    // Scenario A: Full data available
    if (analytics?.averageMonthlySpending && 
        parseFloat(analytics.averageMonthlySpending.toString()) > 0 && 
        analytics.twoMonthsAgoSpending && 
        parseFloat(analytics.twoMonthsAgoSpending.toString()) > 0) {
      return 'A';
    }
    
    // Scenario B: Only current month data
    if (analytics?.currentMonthSpending && 
        parseFloat(analytics.currentMonthSpending.toString()) > 0) {
      return 'B';
    }
    
    // Scenario C: No data
    return 'C';
  }
  
  /**
   * Build welcome message based on scenario
   */
  private buildWelcomeMessage(user: any, scenario: 'A' | 'B' | 'C'): string {
    const now = new Date();
    const currentMonthName = format(now, 'MMMM');
    const lastMonthName = format(subMonths(now, 1), 'MMMM');
    const twoMonthsAgoName = format(subMonths(now, 2), 'MMMM');
    const analytics = user.spendingAnalytics;
    
    let template;
    let variables: any = {
      firstName: user.firstName || 'there',
      currentMonthName
    };
    
    switch (scenario) {
      case 'A':
        template = WELCOME_TEMPLATES.FULL_DATA;
        variables = {
          ...variables,
          twoMonthsAgoName,
          twoMonthsAgoAmount: TemplateService.formatCurrency(analytics.twoMonthsAgoSpending),
          lastMonthName,
          lastMonthAmount: TemplateService.formatCurrency(analytics.lastMonthSpending || 0),
          currentMonthAmount: TemplateService.formatCurrency(analytics.currentMonthSpending || 0)
        };
        break;
        
      case 'B':
        template = WELCOME_TEMPLATES.PARTIAL_DATA;
        variables = {
          ...variables,
          currentMonthAmount: TemplateService.formatCurrency(analytics.currentMonthSpending)
        };
        break;
        
      case 'C':
      default:
        template = WELCOME_TEMPLATES.NO_DATA;
        break;
    }
    
    return TemplateService.render(template.template, variables);
  }
  
  /**
   * Resend welcome message (no analytics recalculation)
   */
  async resendWelcomeMessage(userId: string): Promise<WelcomeMessageResult> {
    return this.sendWelcomeMessage(userId, {
      triggerAnalytics: false
    });
  }
  
  /**
   * Send budget confirmation after user sets budget
   */
  async sendBudgetConfirmation(
    userId: string, 
    monthlyBudget: number
  ): Promise<WelcomeMessageResult> {
    try {
      const user = (await prisma.user.findUnique({
        where: { id: userId },
        select: ({
          phoneNumber: true,
          phoneVerified: true,
          spendingAnalytics: {
            select: { currentMonthSpending: true }
          }
        } as any)
      })) as UserWithAnalytics | null;
      
      if (!user || !user.phoneNumber) {
        return {
          success: false,
          error: 'User not found',
          scenario: 'C'
        };
      }
      
      // Calculate daily target
      const now = new Date();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const daysRemaining = daysInMonth - now.getDate() + 1;
      const dailyTarget = Math.round(monthlyBudget / daysRemaining);
      const currentSpending = user.spendingAnalytics?.currentMonthSpending || 0;
      
      const message = TemplateService.render(BUDGET_TEMPLATES.CONFIRMATION.template, {
        monthlyBudget: TemplateService.formatCurrency(monthlyBudget),
        dailyTarget: TemplateService.formatCurrency(dailyTarget),
        currentSpending: TemplateService.formatCurrency(currentSpending)
      });
      
      const result = await this.smsService.sendMessage({
        to: user.phoneNumber,
        body: message,
        messageType: 'TRANSACTIONAL',
        userId: userId
      });
      
      return {
        success: result.success,
        messageId: result.messageId,
        error: result.error,
        scenario: 'C',
        sandboxLimited: result.sandboxSkipped
      };
      
    } catch (error: any) {
      logger.error('Failed to send budget confirmation', {
        userId,
        error: error.message
      });
      return {
        success: false,
        error: error.message,
        scenario: 'C'
      };
    }
  }
  
  /**
   * Send budget update confirmation when user changes budget
   */
  async sendBudgetUpdateConfirmation(
    userId: string, 
    monthlyBudget: number
  ): Promise<WelcomeMessageResult> {
    try {
      const user = (await prisma.user.findUnique({
        where: { id: userId },
        select: ({
          phoneNumber: true,
          phoneVerified: true,
          spendingAnalytics: {
            select: { currentMonthSpending: true }
          }
        } as any)
      })) as UserWithAnalytics | null;
      
      if (!user || !user.phoneNumber) {
        return {
          success: false,
          error: 'User not found',
          scenario: 'C'
        };
      }
      
      // Calculate daily target
      const now = new Date();
      const currentMonthName = format(now, 'MMMM');
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const daysRemaining = daysInMonth - now.getDate() + 1;
      const dailyTarget = Math.round(monthlyBudget / daysRemaining);
      const currentSpending = user.spendingAnalytics?.currentMonthSpending || 0;
      
      const message = TemplateService.render(BUDGET_TEMPLATES.UPDATE_CONFIRMATION.template, {
        monthlyBudget: TemplateService.formatCurrency(monthlyBudget),
        currentMonthName,
        dailyTarget: TemplateService.formatCurrency(dailyTarget),
        currentSpending: TemplateService.formatCurrency(currentSpending)
      });
      
      const result = await this.smsService.sendMessage({
        to: user.phoneNumber,
        body: message,
        messageType: 'TRANSACTIONAL',
        userId: userId
      });
      
      return {
        success: result.success,
        messageId: result.messageId,
        error: result.error,
        scenario: 'C',
        sandboxLimited: result.sandboxSkipped
      };
      
    } catch (error: any) {
      logger.error('Failed to send budget update confirmation', {
        userId,
        error: error.message
      });
      return {
        success: false,
        error: error.message,
        scenario: 'C'
      };
    }
  }
  
  /**
   * Send error message when data cannot be retrieved
   */
  async sendDataErrorMessage(userId: string): Promise<WelcomeMessageResult> {
    try {
      const user = (await prisma.user.findUnique({
        where: { id: userId },
        select: ({
          phoneNumber: true,
          phoneVerified: true
        } as any)
      })) as UserWithAnalytics | null;
      
      if (!user || !user.phoneNumber) {
        return {
          success: false,
          error: 'User not found',
          scenario: 'C'
        };
      }
      
      const message = TemplateService.render(ERROR_TEMPLATES.DATA_ISSUE.template, {});
      
      const result = await this.smsService.sendMessage({
        to: user.phoneNumber,
        body: message,
        messageType: 'TRANSACTIONAL',
        userId: userId
      });
      
      return {
        success: result.success,
        messageId: result.messageId,
        error: result.error,
        scenario: 'C',
        sandboxLimited: result.sandboxSkipped
      };
      
    } catch (error: any) {
      logger.error('Failed to send data error message', {
        userId,
        error: error.message
      });
      return {
        success: false,
        error: error.message,
        scenario: 'C'
      };
    }
  }
  
  private isSimulatorNumber(phoneNumber: string): boolean {
    const simulatorNumbers = [
      // Origination simulators
      '+12065559457',
      '+12065559453', 
      // Destination simulators
      '+14254147755',
      '+14254147156',
      '+14254147266',
      '+14254147489',
      '+14254147499',
      '+14254147511',
      '+14254147600',
      '+14254147633',
      '+14254147654',
      '+14254147688'
    ];
    return simulatorNumbers.includes(phoneNumber);
  }
  
  private maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length <= 4) return phoneNumber;
    return `****${phoneNumber.slice(-4)}`;
  }
}
