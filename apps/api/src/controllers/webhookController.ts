import { Request, Response } from 'express';
import twilio from 'twilio';
import { PrismaClient } from '@prisma/client';
import { logger } from '@logger';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { MessagingService } from '../services/messagingService.js';
import { CalculationService } from '../../../../packages/services/calculationService.js';
import { PlaidAnalyticsService } from '../services/plaidAnalyticsService.js';
import { PlaidWebhookService } from '../services/PlaidWebhookService.js';

const prisma = new PrismaClient();

// Constants for business rules
const SPENDING_GOAL_LIMITS = {
  MIN: 100,
  MAX: 50000
} as const;

const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized webhook request',
  PHONE_NOT_FOUND: 'Phone number not found',
  INVALID_FORMAT: 'Invalid spending goal format',
  MISSING_DATA: 'Missing required webhook data',
  NOT_REGISTERED: 'Your phone number is not registered in our system. Please contact support.',
  INVALID_AMOUNT: 'Please send a whole dollar amount between $100 and $50,000 (e.g., "3000")',
  NO_PREVIOUS_GOAL: 'No previous spending goal found. Please send a dollar amount (e.g., "3000")',
  EMPTY_MESSAGE: 'Please send a spending goal amount (e.g., "3000") or "SAME" to use your previous goal.'
} as const;

// Utility function to validate Twilio webhook signature
const validateTwilioSignature = (req: Request): boolean => {
  const signature = req.headers['x-twilio-signature'] as string;
  
  if (!signature) {
    return false;
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    logger.error('TWILIO_AUTH_TOKEN not configured for signature validation');
    return false;
  }

  // Get the full URL for signature validation
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  
  try {
    return twilio.validateRequest(authToken, signature, url, req.body);
  } catch (error) {
    logger.error('Error validating Twilio signature', { error: (error as Error).message });
    return false;
  }
};

// Utility function to parse spending goal from message body
const parseSpendingGoal = (body: string, previousGoalAmount?: number): number | null => {
  if (!body || typeof body !== 'string') {
    return null;
  }

  const trimmed = body.trim();
  
  // Handle "SAME" keyword (case-insensitive)
  if (trimmed.toLowerCase() === 'same') {
    return previousGoalAmount || null;
  }

  // Strip "$" prefix if present
  let numericString = trimmed;
  if (numericString.startsWith('$')) {
    numericString = numericString.substring(1);
  }

  // Parse numeric amount
  const amount = parseInt(numericString, 10);
  
  // Validate it's a valid integer (compare against cleaned string)
  if (isNaN(amount) || amount.toString() !== numericString) {
    return null;
  }

  // Validate within reasonable limits
  if (amount < SPENDING_GOAL_LIMITS.MIN || amount > SPENDING_GOAL_LIMITS.MAX) {
    return null;
  }

  return amount;
};

// Utility function to calculate period dates
const calculatePeriodDates = (monthStartDay?: number): { periodStart: Date, periodEnd: Date, actualMonthStartDay: number } => {
  const now = new Date();
  
  // Use calendar month periods (1st to last day of month)
  const periodStart = startOfMonth(now);
  const periodEnd = endOfMonth(now);
  
  // Always use 1st of month as start day
  const actualMonthStartDay = 1;

  return { periodStart, periodEnd, actualMonthStartDay };
};

// Utility function to send response message (SMS or WhatsApp)
const sendResponse = async (to: string, message: string, preferredChannel?: 'sms' | 'whatsapp'): Promise<void> => {
  try {
    const messagingService = new MessagingService();
    
    const result = await messagingService.sendMessage({
      to,
      body: message,
      forceChannel: preferredChannel
    });

    if (result.success) {
      logger.info('Response message sent successfully', { 
        to: `${to.substring(0, 4)}...`,
        channel: result.channel,
        messageSid: result.messageSid,
        messageLength: message.length,
        fallbackUsed: result.fallbackUsed || false
      });
    } else {
      logger.error('Failed to send response message', {
        to: `${to.substring(0, 4)}...`,
        channel: result.channel,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Failed to send response message', { 
      to: `${to.substring(0, 4)}...`,
      error: (error as Error).message 
    });
    // Don't throw error - we still want to return TwiML
  }
};

// Utility function to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Note: Welcome message analytics are handled in TwilioController after phone verification

export class WebhookController {
  private messagingService: MessagingService;
  private calculationService: CalculationService;
  private plaidAnalyticsService: PlaidAnalyticsService;
  private plaidWebhookService: PlaidWebhookService;

  constructor() {
    this.messagingService = new MessagingService();
    this.calculationService = new CalculationService();
    this.plaidAnalyticsService = new PlaidAnalyticsService();
    this.plaidWebhookService = new PlaidWebhookService();
  }

  public handleIncomingMessage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Validate Twilio signature for security
    if (!validateTwilioSignature(req)) {
      logger.warn('Invalid Twilio signature attempt', { 
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        signature: req.headers['x-twilio-signature'] ? 'present' : 'missing'
      });
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED, 401);
    }

    // Parse incoming message using the messaging service
    const messageInfo = this.messagingService.parseIncomingMessage(req.body);
    const { phoneNumber, messageBody, channel, messageSid } = messageInfo;

    // Validate required webhook data
    if (!phoneNumber || !messageSid) {
      logger.warn('Missing required webhook data', { phoneNumber, messageSid });
      throw new AppError(ERROR_MESSAGES.MISSING_DATA, 400);
    }

    logger.info('Processing incoming Twilio message', { 
      phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 4)}...` : 'null',
      messageSid,
      channel,
      bodyLength: messageBody?.length || 0
    });

    try {
      // Look up user by phone number
      const user = await prisma.user.findUnique({
        where: { phoneNumber },
        select: { 
          id: true, 
          firstName: true,
          spendingGoals: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { monthlyLimit: true }
          }
        }
      });

      if (!user) {
        logger.warn('Phone number not found in database', { phoneNumber, channel });
        
        // Send error message using the same channel the user messaged from
        await sendResponse(phoneNumber, ERROR_MESSAGES.NOT_REGISTERED, channel);
        
        throw new AppError(ERROR_MESSAGES.PHONE_NOT_FOUND, 404);
      }

      // Validate message body
      if (!messageBody || messageBody.trim().length === 0) {
        await sendResponse(phoneNumber, ERROR_MESSAGES.EMPTY_MESSAGE, channel);
        throw new AppError(ERROR_MESSAGES.MISSING_DATA, 400);
      }

      // Get previous goal amount if exists
      const previousGoalAmount = user.spendingGoals[0] 
        ? Number(user.spendingGoals[0].monthlyLimit) 
        : undefined;

      // Parse spending goal from message
      const goalAmount = parseSpendingGoal(messageBody, previousGoalAmount);

      if (goalAmount === null) {
        let errorMessage: string = ERROR_MESSAGES.INVALID_AMOUNT;
        
        // Special case for "SAME" with no previous goal
        if (messageBody.trim().toLowerCase() === 'same' && !previousGoalAmount) {
          errorMessage = ERROR_MESSAGES.NO_PREVIOUS_GOAL;
        }
        // Special case for decimal amounts
        else if (messageBody.trim().includes('.')) {
          errorMessage = 'Please send a whole dollar amount between $100 and $50,000 (e.g., "3000")';
        }
        
        await sendResponse(phoneNumber, errorMessage, channel);
        throw new AppError(ERROR_MESSAGES.INVALID_FORMAT, 400);
      }

      // Calculate period dates based on goal creation date
      const { periodStart, periodEnd, actualMonthStartDay } = calculatePeriodDates();

      // Create new spending goal and deactivate previous ones in a transaction
      await prisma.$transaction(async (tx) => {
        // Deactivate all previous goals for this user
        await tx.spendingGoal.updateMany({
          where: { 
            userId: user.id,
            isActive: true 
          },
          data: { isActive: false }
        });

        // Create new spending goal
        await tx.spendingGoal.create({
          data: {
            userId: user.id,
            monthlyLimit: goalAmount,
            monthStartDay: actualMonthStartDay, // Actual day when period starts
            periodStart,
            periodEnd,
            isActive: true
          }
        });
      });

      logger.info('Spending goal created successfully', { 
        userId: user.id,
        goalAmount,
        periodStart: format(periodStart, 'yyyy-MM-dd'),
        periodEnd: format(periodEnd, 'yyyy-MM-dd')
      });

      // Calculate today's daily target using real period spending data
      let dailyTarget = 0;
      let currentPeriodSpending = 0;
      let calculationError: string | undefined;

      try {
        // Fetch real transaction data for the period
        const { transactions, error } = await this.plaidAnalyticsService.fetchPeriodTransactions(
          user.id, 
          periodStart, 
          periodEnd
        );

        if (error) {
          calculationError = error;
          logger.warn('Using fallback calculation due to Plaid error', { 
            userId: user.id, 
            error 
          });
        } else {
          // Convert transactions and calculate period spending
          const plaidTransactions = this.calculationService.convertToPlaidTransactions(transactions);
          currentPeriodSpending = this.calculationService.calculatePeriodSpending(
            plaidTransactions, 
            periodStart, 
            periodEnd
          );
        }

        // Calculate period-aware daily target
        dailyTarget = this.calculationService.calculatePeriodAwareDailyTarget(
          goalAmount,
          currentPeriodSpending,
          periodStart,
          periodEnd
        );

        logger.info('Daily target calculated', {
          userId: user.id,
          goalAmount,
          currentPeriodSpending,
          dailyTarget,
          periodStart: format(periodStart, 'yyyy-MM-dd'),
          periodEnd: format(periodEnd, 'yyyy-MM-dd'),
          hasPlaidError: !!calculationError
        });

      } catch (targetCalculationError: any) {
        logger.error('Failed to calculate daily target', {
          userId: user.id,
          error: targetCalculationError.message
        });
        
        // Graceful fallback to basic calculation
        dailyTarget = this.calculationService.calculateDailyTarget(goalAmount, 0);
        calculationError = 'Unable to fetch current spending data';
      }

      const formattedTarget = this.calculationService.formatDailyTargetMessage(dailyTarget);

      // Send confirmation message using the exact new template
      let confirmationMessage = `moony

✅ Perfect! Your ${formatCurrency(goalAmount)} monthly budget is all set.

🎯 Today's spending target: ${formattedTarget}
Progress: ${formatCurrency(currentPeriodSpending)} spent of ${formatCurrency(goalAmount)}

You'll get a daily text like this each morning to help you stay on track. Your budget resets on the 1st of every month.

Reply STOP to opt out anytime.`;

      // Add note about spending data if there was an error
      if (calculationError && currentPeriodSpending === 0) {
        confirmationMessage += '\n\n(Target calculated without current spending data)';
      }

      await sendResponse(phoneNumber, confirmationMessage, channel);

      // Return empty TwiML response as per Twilio webhook requirements
      res.set('Content-Type', 'application/xml');
      res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');

    } catch (error: any) {
      // Log detailed error for debugging
      logger.error('Failed to process incoming message', {
        phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 4)}...` : 'null',
        messageSid,
        error: error.message,
        stack: error.stack
      });

      // If this is an AppError, we've already sent appropriate SMS
      if (error instanceof AppError) {
        throw error;
      }

      // For unexpected errors, send generic error message and return TwiML
      const messageInfo = this.messagingService.parseIncomingMessage(req.body);
      await sendResponse(messageInfo.phoneNumber, 'Sorry, there was an error processing your message. Please try again later.', messageInfo.channel);
      res.set('Content-Type', 'application/xml');
      res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }
  });

  /**
   * Handle Plaid webhooks (HISTORICAL_UPDATE, etc.)
   * Fast response required - async processing handled by PlaidWebhookService
   */
  public handlePlaidWebhook = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const signature = req.headers['plaid-verification'] as string;
    
    try {
      logger.info('Plaid webhook received', {
        webhook_type: req.body?.webhook_type,
        webhook_code: req.body?.webhook_code,
        item_id: req.body?.item_id,
        hasSignature: !!signature
      });

      // Quick validation of required fields
      if (!req.body || typeof req.body !== 'object') {
        logger.error('Invalid Plaid webhook payload', { body: req.body });
        res.status(400).json({ error: 'Invalid payload' });
        return;
      }

      // Get raw body for signature verification
      const rawBody = JSON.stringify(req.body);

      // Process webhook asynchronously
      const result = await this.plaidWebhookService.handleWebhook(
        req.body,
        signature || '',
        rawBody
      );

      const processingTime = Date.now() - startTime;

      logger.info('Plaid webhook processing completed', {
        webhook_type: req.body.webhook_type,
        webhook_code: req.body.webhook_code,
        item_id: req.body.item_id,
        success: result.success,
        message: result.message,
        processingTimeMs: processingTime
      });

      // Return success response quickly (within 10 seconds as required by Plaid)
      if (result.success) {
        res.status(200).json({ 
          status: 'success',
          message: result.message 
        });
      } else {
        // For webhook processing failures, return appropriate status
        const statusCode = result.shouldRetry ? 500 : 400;
        res.status(statusCode).json({ 
          error: result.message 
        });
      }

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      
      logger.error('Failed to process Plaid webhook', {
        webhook_type: req.body?.webhook_type,
        webhook_code: req.body?.webhook_code,
        item_id: req.body?.item_id,
        error: error.message,
        processingTimeMs: processingTime
      });

      // Return 500 to trigger Plaid retry
      res.status(500).json({ 
        error: 'Webhook processing failed',
        message: error.message 
      });
    }
  });
}
