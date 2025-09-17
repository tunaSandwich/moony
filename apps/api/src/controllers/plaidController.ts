import { Request, Response } from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import { PlaidService } from '@services/plaidService';
import { logger } from '@logger';
import { ApiResponse, LinkTokenRequest, ExchangeTokenRequest } from '../types/index.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

export class PlaidController {
  private plaidService: PlaidService;

  constructor() {
    this.plaidService = new PlaidService();
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
