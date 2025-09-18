import { Request, Response } from 'express';
import twilio from 'twilio';
import { PrismaClient } from '@prisma/client';
import { logger } from '@logger';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { startOfMonth, endOfMonth, format } from 'date-fns';

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

  // Parse numeric amount
  const amount = parseInt(trimmed, 10);
  
  // Validate it's a valid integer
  if (isNaN(amount) || amount.toString() !== trimmed) {
    return null;
  }

  // Validate within reasonable limits
  if (amount < SPENDING_GOAL_LIMITS.MIN || amount > SPENDING_GOAL_LIMITS.MAX) {
    return null;
  }

  return amount;
};

// Utility function to calculate period dates
const calculatePeriodDates = (monthStartDay: number = 1): { periodStart: Date, periodEnd: Date } => {
  const now = new Date();
  
  // For simplicity, we'll use calendar months starting from day 1
  // TODO: Implement custom month_start_day logic if needed
  const periodStart = startOfMonth(now);
  const periodEnd = endOfMonth(now);

  return { periodStart, periodEnd };
};

// Utility function to send SMS response
const sendSMSResponse = async (to: string, message: string): Promise<void> => {
  try {
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    if (!twilioPhoneNumber) {
      logger.error('TWILIO_PHONE_NUMBER not configured');
      return;
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
      logger.error('Twilio credentials not configured for SMS sending');
      return;
    }

    const twilioClient = twilio(accountSid, authToken);
    
    await twilioClient.messages.create({
      from: twilioPhoneNumber,
      to: to,
      body: message
    });

    logger.info('SMS response sent successfully', { to, messageLength: message.length });
  } catch (error) {
    logger.error('Failed to send SMS response', { 
      to, 
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

export class WebhookController {
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

    const { From: phoneNumber, Body: messageBody, MessageSid } = req.body;

    // Validate required webhook data
    if (!phoneNumber || !MessageSid) {
      logger.warn('Missing required webhook data', { phoneNumber, MessageSid });
      throw new AppError(ERROR_MESSAGES.MISSING_DATA, 400);
    }

    logger.info('Processing incoming Twilio message', { 
      phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 4)}...` : 'null',
      MessageSid,
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
        logger.warn('Phone number not found in database', { phoneNumber });
        
        // Send error SMS to unknown number
        await sendSMSResponse(phoneNumber, ERROR_MESSAGES.NOT_REGISTERED);
        
        throw new AppError(ERROR_MESSAGES.PHONE_NOT_FOUND, 404);
      }

      // Validate message body
      if (!messageBody || messageBody.trim().length === 0) {
        await sendSMSResponse(phoneNumber, ERROR_MESSAGES.EMPTY_MESSAGE);
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
        
        await sendSMSResponse(phoneNumber, errorMessage);
        throw new AppError(ERROR_MESSAGES.INVALID_FORMAT, 400);
      }

      // Calculate period dates
      const { periodStart, periodEnd } = calculatePeriodDates();

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
            monthStartDay: 1, // Default to 1st of month
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

      // Send confirmation SMS
      const confirmationMessage = `✅ Your spending goal of ${formatCurrency(goalAmount)} has been set for ${format(periodStart, 'MMM yyyy')}. You'll receive daily updates on your progress!`;
      await sendSMSResponse(phoneNumber, confirmationMessage);

      // Return empty TwiML response as per Twilio webhook requirements
      res.set('Content-Type', 'application/xml');
      res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');

    } catch (error: any) {
      // Log detailed error for debugging
      logger.error('Failed to process incoming message', {
        phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 4)}...` : 'null',
        MessageSid,
        error: error.message,
        stack: error.stack
      });

      // If this is an AppError, we've already sent appropriate SMS
      if (error instanceof AppError) {
        throw error;
      }

      // For unexpected errors, send generic error SMS and return TwiML
      await sendSMSResponse(phoneNumber, 'Sorry, there was an error processing your message. Please try again later.');
      res.set('Content-Type', 'application/xml');
      res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }
  });
}