import { prisma } from '../../db.js';
import { TwilioSMSService } from './smsService.js';
import { TemplateService } from '../templateService.js';
import { BUDGET_TEMPLATES, ERROR_TEMPLATES } from '../../templates/smsTemplates.js';
import { logger } from 'packages/utils/logger.js';
import { Decimal } from '@prisma/client/runtime/library';

export interface TwilioIncomingSMSMessage {
  From: string;         // E.164 phone number
  To: string;           // Your Twilio phone number
  Body: string;         // Message content
  MessageSid: string;   // Twilio message ID
  AccountSid: string;   // Your Twilio account SID
  NumSegments: string;  // Number of SMS segments
  SmsStatus?: string;   // Message status
  NumMedia?: string;    // Number of media attachments
}

export interface BudgetParseResult {
  isValid: boolean;
  amount?: number;
  originalText: string;
  command?: 'STOP' | 'HELP' | 'START' | 'BUDGET';
}

export class TwilioIncomingMessageHandler {
  private smsService: TwilioSMSService;
  
  constructor() {
    this.smsService = new TwilioSMSService();
  }
  
  /**
   * Process incoming SMS message from Twilio webhook
   */
  async processIncomingMessage(message: TwilioIncomingSMSMessage): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info('Processing incoming Twilio SMS message', {
        from: this.maskPhoneNumber(message.From),
        to: this.maskPhoneNumber(message.To),
        messageSid: message.MessageSid,
        bodyLength: message.Body.length,
        numSegments: message.NumSegments
      });
      
      // Look up user by phone number
      const user = await prisma.user.findFirst({
        where: { 
          phoneNumber: message.From,
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
          phone: this.maskPhoneNumber(message.From)
        });
        // Don't send error message to unknown numbers
        return;
      }
      
      // Parse the message
      const parseResult = this.parseBudgetMessage(message.Body);
      
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
      logger.info('Incoming Twilio message processed', {
        userId: user.id,
        duration,
        action: parseResult.command || (parseResult.isValid ? 'budget_set' : 'invalid')
      });
      
    } catch (error: any) {
      logger.error('Failed to process incoming Twilio message', {
        error: error.message,
        messageSid: message.MessageSid
      });
      throw error;
    }
  }
  
  /**
   * Parse budget amount from message text - identical to AWS implementation
   */
  parseBudgetMessage(messageBody: string): BudgetParseResult {
    const text = messageBody.trim().toUpperCase();
    
    // Check for commands first
    if (text === 'STOP' || text === 'UNSUBSCRIBE' || text === 'CANCEL' || text === 'END' || text === 'QUIT') {
      return { isValid: true, originalText: messageBody, command: 'STOP' };
    }
    
    if (text === 'START' || text === 'YES' || text === 'UNSTOP') {
      return { isValid: true, originalText: messageBody, command: 'START' };
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
   * Update user's budget and send confirmation - identical to AWS implementation
   */
  private async updateUserBudget(
    user: any, 
    budgetAmount: number,
    message: TwilioIncomingSMSMessage
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
        logger.info('User budget updated via Twilio SMS', {
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
      
      // Send confirmation via Twilio
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
          lastSmsMessageId: message.MessageSid
        }
      });
      
      logger.info('Budget confirmation sent via Twilio', {
        userId: user.id,
        budgetAmount,
        isUpdate
      });
      
    } catch (error: any) {
      logger.error('Failed to update user budget via Twilio', {
        userId: user.id,
        budgetAmount,
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Handle special commands (STOP, HELP, START)
   */
  private async handleCommand(user: any, command: 'STOP' | 'HELP' | 'START' | 'BUDGET'): Promise<void> {
    switch (command) {
      case 'STOP':
        // Update opt-out status
        await prisma.user.update({
          where: { id: user.id },
          data: { optOutStatus: 'opted_out' }
        });
        
        // Send confirmation - Twilio handles STOP automatically but we can send custom message
        await this.smsService.sendMessage({
          to: user.phoneNumber,
          body: 'You\'ve been unsubscribed from moony. Reply START to resubscribe.',
          messageType: 'TRANSACTIONAL'
        });
        
        logger.info('User opted out via Twilio SMS', { userId: user.id });
        break;
        
      case 'START':
        // Update opt-in status
        await prisma.user.update({
          where: { id: user.id },
          data: { optOutStatus: 'opted_in' }
        });
        
        // Send welcome back message
        await this.smsService.sendMessage({
          to: user.phoneNumber,
          body: 'Welcome back to moony! You\'ve been resubscribed. Reply with a number to set your monthly budget.',
          messageType: 'TRANSACTIONAL'
        });
        
        logger.info('User opted back in via Twilio SMS', { userId: user.id });
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
        
        logger.info('Help message sent via Twilio SMS', { userId: user.id });
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
  
  private maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length <= 4) return phoneNumber;
    return `****${phoneNumber.slice(-4)}`;
  }
}