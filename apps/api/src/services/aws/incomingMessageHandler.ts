import { prisma } from '../../db.js';
import { AWSSMSService } from './smsService.js';
import { TemplateService } from '../templateService.js';
import { BUDGET_TEMPLATES, ERROR_TEMPLATES } from '../../templates/smsTemplates.js';
import { logger } from 'packages/utils/logger.js';
import { Decimal } from '@prisma/client/runtime/library';

export interface IncomingSMSMessage {
  originationNumber: string;
  destinationNumber: string;
  messageBody: string;
  messageKeyword?: string;
  inboundMessageId: string;
  previousPublishedMessageId?: string;
}

export interface BudgetParseResult {
  isValid: boolean;
  amount?: number;
  originalText: string;
  command?: 'STOP' | 'HELP' | 'BUDGET';
}

export class IncomingMessageHandler {
  private smsService: AWSSMSService;
  
  constructor() {
    this.smsService = new AWSSMSService();
  }
  
  /**
   * Process incoming SMS message from SNS
   */
  async processIncomingMessage(message: IncomingSMSMessage): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info('Processing incoming SMS message', {
        from: this.maskPhoneNumber(message.originationNumber),
        to: this.maskPhoneNumber(message.destinationNumber),
        messageId: message.inboundMessageId,
        bodyLength: message.messageBody.length
      });
      
      // Handle simulator number mapping in development
      let phoneNumber = message.originationNumber;
      if (this.isSimulatorNumber(phoneNumber)) {
        // In development, try to map back to a test user
        phoneNumber = await this.mapSimulatorToRealNumber(phoneNumber);
      }
      
      // Look up user by phone number
      const user = await prisma.user.findFirst({
        where: { 
          phoneNumber,
          phoneVerified: true,
          isActive: true
        },
        include: {
          spendingGoals: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          spendingAnalytics: true
        }
      });
      
      if (!user) {
        logger.warn('No active user found for phone number', {
          phone: this.maskPhoneNumber(phoneNumber)
        });
        // Don't send error message to unknown numbers
        return;
      }
      
      // Parse the message
      const parseResult = this.parseBudgetMessage(message.messageBody);
      
      // Handle special commands
      if (parseResult.command) {
        await this.handleCommand(user, parseResult.command);
        return;
      }
      
      // Handle budget setting
      if (parseResult.isValid && parseResult.amount) {
        await this.updateUserBudget(user, parseResult.amount, message);
      } else {
        // Send error message for invalid format
        await this.sendInvalidFormatMessage(user.phoneNumber);
      }
      
      const duration = Date.now() - startTime;
      logger.info('Incoming message processed', {
        userId: user.id,
        duration,
        action: parseResult.command || (parseResult.isValid ? 'budget_set' : 'invalid')
      });
      
    } catch (error: any) {
      logger.error('Failed to process incoming message', {
        error: error.message,
        messageId: message.inboundMessageId
      });
      throw error;
    }
  }
  
  /**
   * Parse budget amount from message text
   */
  parseBudgetMessage(messageBody: string): BudgetParseResult {
    const text = messageBody.trim().toUpperCase();
    
    // Check for commands first
    if (text === 'STOP' || text === 'UNSUBSCRIBE' || text === 'CANCEL') {
      return { isValid: true, originalText: messageBody, command: 'STOP' };
    }
    
    if (text === 'HELP' || text === 'INFO') {
      return { isValid: true, originalText: messageBody, command: 'HELP' };
    }
    
    // Try to extract budget amount
    // Remove common prefixes and symbols
    const cleaned = messageBody
      .toLowerCase()
      .replace(/^(budget|goal|limit|set|my budget is|i want|make it)/gi, '')
      .replace(/[,$]/g, '')
      .trim();
    
    // Try different number formats
    const patterns = [
      /^(\d+)$/,                    // Simple number: "2000"
      /^(\d{1,3}(?:,?\d{3})*)$/,   // With commas: "2,000" or "2000"
      /^(\d+(?:\.\d{2})?)$/,       // With decimals: "2000.00"
      /(\d{3,6})/                   // Extract 3-6 digit number from text
    ];
    
    for (const pattern of patterns) {
      const match = cleaned.match(pattern);
      if (match) {
        const amount = parseFloat(match[1].replace(/,/g, ''));
        
        // Validate reasonable budget range ($100 - $100,000)
        if (amount >= 100 && amount <= 100000) {
          return {
            isValid: true,
            amount: Math.round(amount), // Round to nearest dollar
            originalText: messageBody
          };
        }
      }
    }
    
    // Check for written numbers
    const writtenNumbers: Record<string, number> = {
      'one thousand': 1000,
      'two thousand': 2000,
      'three thousand': 3000,
      'four thousand': 4000,
      'five thousand': 5000,
      'fifteen hundred': 1500,
      'twenty five hundred': 2500,
    };
    
    for (const [written, value] of Object.entries(writtenNumbers)) {
      if (cleaned.includes(written)) {
        return {
          isValid: true,
          amount: value,
          originalText: messageBody
        };
      }
    }
    
    return { isValid: false, originalText: messageBody };
  }
  
  /**
   * Update user's budget and send confirmation
   */
  private async updateUserBudget(
    user: any, 
    budgetAmount: number,
    message: IncomingSMSMessage
  ): Promise<void> {
    try {
      // Create or update spending goal
      const now = new Date();
      const monthStartDay = 1; // Always start on the 1st
      const year = now.getFullYear();
      const month = now.getMonth();
      
      // Calculate period start and end
      const periodStart = new Date(year, month, monthStartDay);
      const periodEnd = new Date(year, month + 1, 0); // Last day of month
      
      // Deactivate old goals and create new one
      await prisma.$transaction(async (tx) => {
        // Deactivate existing goals
        await tx.spendingGoal.updateMany({
          where: {
            userId: user.id,
            isActive: true
          },
          data: { isActive: false }
        });
        
        // Create new goal
        await tx.spendingGoal.create({
          data: {
            userId: user.id,
            monthlyLimit: new Decimal(budgetAmount),
            monthStartDay,
            periodStart,
            periodEnd,
            isActive: true
          }
        });
        
        // Log the budget update
        logger.info('User budget updated via SMS', {
          userId: user.id,
          newBudget: budgetAmount,
          previousBudget: user.spendingGoals[0]?.monthlyLimit?.toString()
        });
      });
      
      // Calculate daily target
      const daysInMonth = periodEnd.getDate();
      const daysRemaining = daysInMonth - now.getDate() + 1;
      const dailyTarget = Math.round(budgetAmount / daysRemaining);
      const currentSpending = user.spendingAnalytics?.currentMonthSpending || 0;
      
      // Determine if this is first budget or update
      const isUpdate = user.spendingGoals.length > 0;
      const template = isUpdate ? BUDGET_TEMPLATES.UPDATE_CONFIRMATION : BUDGET_TEMPLATES.CONFIRMATION;
      
      // Build confirmation message
      const confirmationMessage = TemplateService.render(template.template, {
        monthlyBudget: TemplateService.formatCurrency(budgetAmount),
        dailyTarget: TemplateService.formatCurrency(dailyTarget),
        currentSpending: TemplateService.formatCurrency(currentSpending),
        currentMonthName: new Intl.DateTimeFormat('en-US', { month: 'long' }).format(now)
      });
      
      // Send confirmation
      await this.smsService.sendMessage({
        to: user.phoneNumber,
        body: confirmationMessage,
        messageType: 'TRANSACTIONAL'
      });
      
      // Update user SMS tracking
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastSmsSentAt: new Date(),
          lastSmsMessageId: message.inboundMessageId
        }
      });
      
      logger.info('Budget confirmation sent', {
        userId: user.id,
        budgetAmount,
        isUpdate
      });
      
    } catch (error: any) {
      logger.error('Failed to update user budget', {
        userId: user.id,
        budgetAmount,
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Handle special commands (STOP, HELP)
   */
  private async handleCommand(user: any, command: 'STOP' | 'HELP' | 'BUDGET'): Promise<void> {
    switch (command) {
      case 'STOP':
        // Update opt-out status
        await prisma.user.update({
          where: { id: user.id },
          data: { optOutStatus: 'opted_out' }
        });
        
        // Send confirmation
        await this.smsService.sendMessage({
          to: user.phoneNumber,
          body: 'You\'ve been unsubscribed from moony. Reply START to resubscribe.',
          messageType: 'TRANSACTIONAL'
        });
        
        logger.info('User opted out via SMS', { userId: user.id });
        break;
        
      case 'HELP':
        const helpMessage = `moony Help:
        
Reply with a number to set your monthly budget (ex: 2000)
Reply STOP to unsubscribe
Reply START to resubscribe

For support: support@moony.app`;
        
        await this.smsService.sendMessage({
          to: user.phoneNumber,
          body: helpMessage,
          messageType: 'TRANSACTIONAL'
        });
        break;
    }
  }
  
  /**
   * Send error message for invalid budget format
   */
  private async sendInvalidFormatMessage(phoneNumber: string): Promise<void> {
    const message = TemplateService.render(ERROR_TEMPLATES.INVALID_BUDGET.template, {});
    
    await this.smsService.sendMessage({
      to: phoneNumber,
      body: message,
      messageType: 'TRANSACTIONAL'
    });
  }
  
  /**
   * Map simulator number to real user for testing
   */
  private async mapSimulatorToRealNumber(simulatorNumber: string): Promise<string> {
    // In development, find the most recent test user
    if (process.env.AWS_USE_SIMULATOR_OVERRIDE === 'true') {
      const testUser = await prisma.user.findFirst({
        where: { phoneVerified: true },
        orderBy: { createdAt: 'desc' }
      });
      
      if (testUser) {
        logger.info('Mapping simulator to test user', {
          simulator: simulatorNumber,
          user: this.maskPhoneNumber(testUser.phoneNumber)
        });
        return testUser.phoneNumber;
      }
    }
    
    return simulatorNumber;
  }
  
  private isSimulatorNumber(phoneNumber: string): boolean {
    const simulatorNumbers = [
      '+14254147755',
      '+12065559457',
      '+12065559453'
    ];
    return simulatorNumbers.includes(phoneNumber);
  }
  
  private maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length <= 4) return phoneNumber;
    return `****${phoneNumber.slice(-4)}`;
  }
}