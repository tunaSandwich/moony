import { Request, Response } from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import { PlaidApi, Configuration, PlaidEnvironments } from 'plaid';
import { PrismaClient } from '@prisma/client';
import { logger } from '@logger';
import { ApiResponse, LinkTokenRequest, ExchangeTokenRequest } from '../types/index.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { encrypt, validateEncryptionKey } from '../utils/encryption.js';

const prisma = new PrismaClient();

// Constants for better maintainability
const PLAID_ERROR_TYPES = {
  INVALID_TOKEN: 'INVALID_PUBLIC_TOKEN',
  PLAID_ERROR: 'PlaidError',
  NETWORK_ERROR: 'NetworkError',
  SERVER_ERROR: 'PlaidServerError',
  CONNECTION_REFUSED: 'ECONNREFUSED'
} as const;

const ERROR_MESSAGES = {
  INVALID_TOKEN: 'Invalid Plaid token',
  NETWORK_ERROR: 'Unable to connect to bank. Please try again.',
  CONFIG_ERROR: 'Server configuration error',
  GENERIC_ERROR: 'Failed to connect bank account',
  SUCCESS: 'Bank connected successfully'
} as const;

export class PlaidController {
  private plaidService: any; // Keep for compatibility with existing methods
  private plaidClient: PlaidApi;

  constructor() {
    // Initialize PlaidService only if it exists (for backward compatibility)
    try {
      const { PlaidService } = require('@services/plaidService');
      this.plaidService = new PlaidService();
    } catch {
      this.plaidService = null;
    }
    
    // Initialize Plaid client for the new connect endpoint
    const configuration = new Configuration({
      basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
          'PLAID-SECRET': process.env.PLAID_SECRET,
        },
      },
    });
    this.plaidClient = new PlaidApi(configuration);
  }

  public createLinkToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId = 'demo-user' } = req.body as LinkTokenRequest;
    
    logger.info('Creating link token', { userId });
    
    const linkToken = await this.plaidService.createLinkToken(userId);
    
    const response: ApiResponse<{ link_token: string }> = {
      success: true,
      data: { link_token: linkToken },
      message: 'Link token created successfully',
    };

    logger.info('Link token created successfully', { userId });
    res.status(200).json(response);
  });

  public exchangePublicToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { public_token } = req.body as ExchangeTokenRequest;
    
    logger.info('Exchanging public token', { 
      tokenPrefix: public_token.substring(0, 20) + '...' 
    });

    const accessToken = await this.plaidService.exchangePublicToken(public_token);
    
    // Store token for development purposes
    await this.storeAccessToken(accessToken);
    
    const response: ApiResponse<{ status: string }> = {
      success: true,
      data: { status: 'success' },
      message: 'Public token exchanged successfully',
    };

    logger.info('Public token exchanged and stored successfully');
    res.status(200).json(response);
  });

  public connectBank = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { public_token } = req.body;
    const userId = req.user?.id;

    // Validate input
    if (!public_token || typeof public_token !== 'string' || public_token.trim().length === 0) {
      throw new AppError('Public token is required', 400);
    }

    if (!userId) {
      throw new AppError('Invalid or expired token', 401);
    }

    try {
      logger.info('Connecting bank account for user', { userId });

      // Exchange public token for access token via Plaid API
      const response = await this.plaidClient.itemPublicTokenExchange({
        public_token: public_token,
      });

      const accessToken = response.data.access_token;

      // Validate and encrypt the access token before storing
      const encryptionKey = process.env.ENCRYPTION_KEY;
      if (!encryptionKey || !validateEncryptionKey(encryptionKey)) {
        logger.error('Invalid encryption configuration', { userId });
        throw new AppError(ERROR_MESSAGES.CONFIG_ERROR, 500);
      }

      const encryptedAccessToken = encrypt(accessToken, encryptionKey);

      // Update user record with encrypted access token
      await prisma.user.update({
        where: { id: userId },
        data: { plaidAccessToken: encryptedAccessToken },
      });

      logger.info('Bank connected successfully', { userId });

      // Return success response
      res.status(200).json({
        message: ERROR_MESSAGES.SUCCESS,
        hasConnectedBank: true,
      });

    } catch (error: any) {
      // Log detailed error for debugging (server-side only)
      logger.error('Failed to connect bank', { 
        userId, 
        error: error.message,
        errorName: error.name,
        errorCode: error.code
      });

      // Handle specific Plaid errors without exposing internal details
      if (error.message?.includes(PLAID_ERROR_TYPES.INVALID_TOKEN) || error.name === PLAID_ERROR_TYPES.PLAID_ERROR) {
        throw new AppError(ERROR_MESSAGES.INVALID_TOKEN, 400);
      }

      // Handle network/service errors
      if (error.code === PLAID_ERROR_TYPES.CONNECTION_REFUSED || 
          error.name === PLAID_ERROR_TYPES.NETWORK_ERROR || 
          error.name === PLAID_ERROR_TYPES.SERVER_ERROR) {
        throw new AppError(ERROR_MESSAGES.NETWORK_ERROR, 502);
      }

      // For any other errors, return a generic message to avoid information leakage
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError(ERROR_MESSAGES.GENERIC_ERROR, 500);
    }
  });

  private async storeAccessToken(accessToken: string): Promise<void> {
    try {
      const storagePath = path.join(process.cwd(), 'temp_access_token.json');
      const tokenData = {
        access_token: accessToken,
        stored_at: new Date().toISOString(),
        expires_note: 'This is for development only. Use environment variables in production.',
      };
      
      await fs.writeFile(
        storagePath, 
        JSON.stringify(tokenData, null, 2), 
        'utf8'
      );
      
      logger.info('Access token stored successfully', { path: storagePath });
    } catch (error) {
      logger.error('Failed to store access token', error);
      throw new AppError('Failed to store access token', 500);
    }
  }
}
