import { Response } from 'express';
import twilio from 'twilio';
import { prisma } from '../../src/db.js';
import { format, subMonths } from 'date-fns';
import { logger } from '@logger';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { MessagingService } from '../services/messagingService.js';
import { WelcomeMessageService } from '../services/aws/welcomeMessageService.js';

// Use shared Prisma client

// Constants for better maintainability
const TWILIO_ERROR_TYPES = {
  NETWORK_ERROR: 'NetworkError',
  TWILIO_ERROR: 'TwilioError',
  RATE_LIMIT_ERROR: 'TwilioRateLimitError',
  VALIDATION_ERROR: 'TwilioValidationError',
  EXPIRED_ERROR: 'TwilioExpiredError',
  CONNECTION_REFUSED: 'ECONNREFUSED'
} as const;

const ERROR_MESSAGES = {
  USER_NOT_FOUND: 'User not found',
  PHONE_ALREADY_VERIFIED: 'Phone number is already verified',
  TWILIO_ERROR: 'Unable to send verification code. Please try again.',
  VERIFICATION_ERROR: 'Unable to verify code. Please try again.',
  INVALID_CODE: 'Invalid verification code',
  EXPIRED_CODE: 'Verification code has expired. Please request a new code.',
  CODE_REQUIRED: 'Verification code is required',
  SUCCESS: 'Verification code sent successfully',
  VERIFICATION_SUCCESS: 'Phone number verified successfully'
} as const;

// Utility function to validate phone number format
const isValidPhoneNumber = (phoneNumber: string): boolean => {
  if (!phoneNumber || typeof phoneNumber !== 'string') return false;
  
  // Basic phone number validation (allows E.164 format)
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phoneNumber.trim());
};

// Utility function to validate verification code format
const isValidVerificationCode = (code: string): boolean => {
  if (!code || typeof code !== 'string') return false;
  
  // Basic verification code validation (typically 4-8 digits)
  const codeRegex = /^\d{4,8}$/;
  return codeRegex.test(code.trim());
};

export class TwilioController {
  private twilioClient: twilio.Twilio;
  private messagingService: MessagingService;
  private welcomeMessageService: WelcomeMessageService;

  constructor() {
    // Validate required environment variables
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) not configured');
    }
    
    if (!verifyServiceSid) {
      throw new Error('Twilio Verify Service SID (TWILIO_VERIFY_SERVICE_SID) not configured');
    }
    
    this.twilioClient = twilio(accountSid, authToken);
    this.messagingService = new MessagingService();
    this.welcomeMessageService = new WelcomeMessageService();
  }

  public sendVerificationCode = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { phoneNumber: requestPhoneNumber } = req.body;

    if (!userId) {
      throw new AppError('Invalid or expired token', 401);
    }

    try {
      logger.info('Sending verification code for user', { userId });

      // Look up user from database
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { phoneNumber: true, phoneVerified: true },
      });

      if (!user) {
        throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, 404);
      }

      // Check if phone is already verified
      if (user.phoneVerified) {
        throw new AppError(ERROR_MESSAGES.PHONE_ALREADY_VERIFIED, 409);
      }

      // Use provided phone number or fall back to user's stored number
      const phoneNumberToUse = requestPhoneNumber || user.phoneNumber;

      // Validate phone number format
      if (!isValidPhoneNumber(phoneNumberToUse)) {
        logger.error('Invalid phone number format', { 
          userId, 
          phoneNumber: phoneNumberToUse ? `${phoneNumberToUse.substring(0, 4)}...` : 'null'
        });
        throw new AppError(ERROR_MESSAGES.TWILIO_ERROR, 502);
      }

      // Update user's phone number if a new one was provided
      if (requestPhoneNumber && requestPhoneNumber !== user.phoneNumber) {
        await prisma.user.update({
          where: { id: userId },
          data: { phoneNumber: requestPhoneNumber }
        });
        logger.info('Updated user phone number', { userId });
      }

      // Get Twilio Verify Service SID from environment
      const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
      if (!verifyServiceSid) {
        logger.error('Twilio Verify Service SID not configured');
        throw new AppError(ERROR_MESSAGES.TWILIO_ERROR, 502);
      }

      // Development mode bypass
      if (process.env.NODE_ENV === 'local') {
        logger.info('Development mode: Skipping Twilio verification, use code 000000', { userId });
        
        res.status(200).json({
          message: 'Development mode: Use code 000000 to verify',
        });
        return;
      }

      // Call Twilio Verify API to send verification code
      await this.twilioClient.verify.v2
        .services(verifyServiceSid)
        .verifications.create({
          to: phoneNumberToUse,
          channel: 'sms',
        });

      logger.info('Verification code sent successfully', { userId });

      // Return success response
      res.status(200).json({
        message: ERROR_MESSAGES.SUCCESS,
      });

    } catch (error: any) {
      // Log detailed error for debugging (server-side only)
      logger.error('Failed to send verification code', { 
        userId, 
        error: error.message,
        errorName: error.name,
        errorCode: error.code
      });

      // Handle specific Twilio errors without exposing internal details
      if (error.code === TWILIO_ERROR_TYPES.CONNECTION_REFUSED || 
          error.name === TWILIO_ERROR_TYPES.NETWORK_ERROR) {
        logger.warn('Network connectivity issue with Twilio API', { userId });
        throw new AppError(ERROR_MESSAGES.TWILIO_ERROR, 502);
      }

      if (error.name === TWILIO_ERROR_TYPES.RATE_LIMIT_ERROR) {
        logger.warn('Twilio API rate limit exceeded', { userId });
        throw new AppError(ERROR_MESSAGES.TWILIO_ERROR, 502);
      }

      if (error.name === TWILIO_ERROR_TYPES.VALIDATION_ERROR ||
          error.name === TWILIO_ERROR_TYPES.TWILIO_ERROR) {
        logger.warn('Twilio API validation or service error', { userId });
        throw new AppError(ERROR_MESSAGES.TWILIO_ERROR, 502);
      }

      // For any other errors, return a generic message to avoid information leakage
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError(ERROR_MESSAGES.TWILIO_ERROR, 502);
    }
  });

  public verifyNumber = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { code } = req.body;

    if (!userId) {
      throw new AppError('Invalid or expired token', 401);
    }

    // Validate verification code input
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      throw new AppError(ERROR_MESSAGES.CODE_REQUIRED, 400);
    }

    // Validate verification code format
    if (!isValidVerificationCode(code)) {
      logger.warn('Invalid verification code format provided', { userId, codeLength: code.length });
      throw new AppError(ERROR_MESSAGES.CODE_REQUIRED, 400);
    }

    try {
      logger.info('Verifying code for user', { userId });

      // Look up user's phone number from database
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { phoneNumber: true, phoneVerified: true },
      });

      if (!user) {
        throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, 404);
      }

      // Validate phone number format
      if (!isValidPhoneNumber(user.phoneNumber)) {
        logger.error('User has invalid phone number format for verification', { 
          userId, 
          phoneNumber: user.phoneNumber ? `${user.phoneNumber.substring(0, 4)}...` : 'null'
        });
        throw new AppError(ERROR_MESSAGES.VERIFICATION_ERROR, 502);
      }

      // Get Twilio Verify Service SID from environment
      const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
      if (!verifyServiceSid) {
        logger.error('Twilio Verify Service SID not configured');
        throw new AppError(ERROR_MESSAGES.VERIFICATION_ERROR, 502);
      }

      // Development mode bypass
      if (process.env.NODE_ENV === 'local') {
        if (code.trim() === '000000') {
          logger.info('Development mode: Accepting bypass code 000000', { userId });
          
          // Use database transaction to ensure data consistency
          await prisma.$transaction(async (tx) => {
            // Update user's phoneVerified field to true
            await tx.user.update({
              where: { id: userId },
              data: { 
                phoneVerified: true,
              },
            });

            logger.info('Phone number verified successfully (dev mode)', { userId });
          });

          // Send welcome SMS with analytics data
          this.sendWelcomeSMS(userId);

          res.status(200).json({
            message: ERROR_MESSAGES.VERIFICATION_SUCCESS,
            twilioStatus: 'verified',
          });
          return;
        } else {
          logger.warn('Development mode: Invalid bypass code', { userId, providedCode: code });
          throw new AppError(ERROR_MESSAGES.INVALID_CODE, 400);
        }
      }

      // Call Twilio Verify API to check verification code
      const verificationCheck = await this.twilioClient.verify.v2
        .services(verifyServiceSid)
        .verificationChecks.create({
          to: user.phoneNumber,
          code: code.trim(),
        });

      if (verificationCheck.status === 'approved') {
        // Use database transaction to ensure data consistency
        await prisma.$transaction(async (tx) => {
          // Update user's phoneVerified field to true
          await tx.user.update({
            where: { id: userId },
            data: { 
              phoneVerified: true,
              // Optionally track when verification was completed
              // verifiedAt: new Date()
            },
          });

          logger.info('Phone number verified successfully', { 
            userId,
            twilioVerificationId: verificationCheck.sid 
          });
        });

        // Send welcome SMS with analytics data
        this.sendWelcomeSMS(userId);

        // Return success response after successful database update
        res.status(200).json({
          message: ERROR_MESSAGES.VERIFICATION_SUCCESS,
          twilioStatus: 'verified',
        });
      } else {
        // Verification failed - log the specific Twilio status
        logger.warn('Verification code validation failed', { 
          userId, 
          twilioStatus: verificationCheck.status,
          twilioSid: verificationCheck.sid
        });
        throw new AppError(ERROR_MESSAGES.INVALID_CODE, 400);
      }

    } catch (error: any) {
      // Log detailed error for debugging (server-side only)
      logger.error('Failed to verify code', { 
        userId, 
        error: error.message,
        errorName: error.name,
        errorCode: error.code
      });

      // Handle specific Twilio errors for verification
      if (error.name === TWILIO_ERROR_TYPES.EXPIRED_ERROR) {
        logger.warn('Verification code expired', { userId });
        throw new AppError(ERROR_MESSAGES.EXPIRED_CODE, 410);
      }

      if (error.name === TWILIO_ERROR_TYPES.VALIDATION_ERROR) {
        logger.warn('Invalid verification code from Twilio', { userId });
        throw new AppError(ERROR_MESSAGES.INVALID_CODE, 400);
      }

      // Handle network connectivity issues
      if (error.code === TWILIO_ERROR_TYPES.CONNECTION_REFUSED || 
          error.name === TWILIO_ERROR_TYPES.NETWORK_ERROR) {
        logger.warn('Network connectivity issue with Twilio API during verification', { userId });
        throw new AppError(ERROR_MESSAGES.VERIFICATION_ERROR, 502);
      }

      if (error.name === TWILIO_ERROR_TYPES.RATE_LIMIT_ERROR) {
        logger.warn('Twilio API rate limit exceeded during verification', { userId });
        throw new AppError(ERROR_MESSAGES.VERIFICATION_ERROR, 502);
      }

      if (error.name === TWILIO_ERROR_TYPES.TWILIO_ERROR) {
        logger.warn('Twilio API service error during verification', { userId });
        throw new AppError(ERROR_MESSAGES.VERIFICATION_ERROR, 502);
      }

      // For any other errors, return a generic message to avoid information leakage
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError(ERROR_MESSAGES.VERIFICATION_ERROR, 502);
    }
  });

  /**
   * Send welcome message via AWS after successful phone verification
   * Non-blocking operation with comprehensive error handling
   */
  public sendWelcomeSMS = async (userId: string): Promise<void> => {
    try {
      logger.info('Sending welcome message via AWS', { userId });
      
      const result = await this.welcomeMessageService.sendWelcomeMessage(userId, {
        triggerAnalytics: true // Trigger analytics calculation for new users
      });
      
      if (result.success) {
        logger.info('Welcome message sent successfully via AWS', {
          userId,
          messageId: result.messageId,
          scenario: result.scenario
        });
      } else {
        // Check if it's a sandbox limitation
        if (result.sandboxLimited) {
          logger.warn('Welcome message blocked by AWS sandbox', {
            userId,
            error: result.error
          });
          // Don't log as error - this is expected in sandbox mode
        } else {
          logger.error('Failed to send welcome message via AWS', {
            userId,
            error: result.error
          });
        }
      }
      
    } catch (error: any) {
      // Log error but don't throw - welcome message failure shouldn't break verification
      logger.error('Exception in welcome message sending', { 
        userId, 
        error: error.message 
      });
    }
  };

  /**
   * Resend welcome message for verified users via AWS
   */
  public resendWelcomeMessage = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Invalid or expired token', 401);
    }

    try {
      logger.info('Resending welcome message via AWS for user', { userId });

      // Look up user from database and verify they are phone verified
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
          phoneVerified: true,
          phoneNumber: true,
          sandboxVerified: true 
        },
      });

      if (!user) {
        throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, 404);
      }

      if (!user.phoneVerified) {
        throw new AppError('Phone number must be verified before receiving messages', 403);
      }

      // Check AWS sandbox verification
      const isSandboxMode = process.env.AWS_SANDBOX_MODE !== 'false';
      if (isSandboxMode && !user.sandboxVerified) {
        // Check if it's a simulator number
        const simulatorNumbers = ['+12065559457', '+12065559453'];
        if (!simulatorNumbers.includes(user.phoneNumber || '')) {
          logger.warn('Cannot resend to unverified number in sandbox', { userId });
          
          res.status(200).json({
            message: 'Message queued for delivery',
            warning: 'Phone number needs AWS sandbox verification'
          });
          return;
        }
      }

      // Use AWS welcome message service
      const result = await this.welcomeMessageService.resendWelcomeMessage(userId);

      if (result.success) {
        logger.info('Welcome message resent successfully via AWS', { 
          userId,
          messageId: result.messageId 
        });

        res.status(200).json({
          message: 'Welcome message sent successfully',
          messageId: result.messageId
        });
      } else {
        logger.error('Failed to resend welcome message via AWS', {
          userId,
          error: result.error
        });
        
        // Still return success to not break frontend flow
        res.status(200).json({
          message: 'Message delivery attempted',
          warning: result.sandboxLimited ? 'Sandbox verification required' : 'Delivery pending'
        });
      }

    } catch (error: any) {
      logger.error('Failed to resend welcome message', { 
        userId, 
        error: error.message 
      });

      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to resend message. Please try again.', 502);
    }
  });

  /**
   * Send budget confirmation via AWS when user sets their budget
   * This will be called from the webhook handler in Phase 4
   */
  public sendBudgetConfirmation = async (
    userId: string, 
    monthlyBudget: number
  ): Promise<void> => {
    try {
      const result = await this.welcomeMessageService.sendBudgetConfirmation(
        userId, 
        monthlyBudget
      );
      
      if (result.success) {
        logger.info('Budget confirmation sent via AWS', {
          userId,
          messageId: result.messageId,
          monthlyBudget
        });
      } else {
        logger.error('Failed to send budget confirmation', {
          userId,
          error: result.error
        });
      }
    } catch (error: any) {
      logger.error('Exception in budget confirmation', {
        userId,
        error: error.message
      });
    }
  };
}
