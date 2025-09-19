import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.js';

export const validateLinkTokenRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // No body validation needed for link token creation - userId comes from JWT
  next();
};

export const validateExchangeTokenRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { public_token } = req.body;
  
  if (!public_token || typeof public_token !== 'string' || public_token.trim().length === 0) {
    throw new AppError('public_token is required and must be a non-empty string', 400);
  }
  
  // Basic format validation for Plaid public tokens
  if (!public_token.startsWith('public-')) {
    throw new AppError('Invalid public_token format', 400);
  }
  
  next();
};

export const validateRequestBody = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.method === 'POST' && (!req.body || typeof req.body !== 'object')) {
    throw new AppError('Request body must be valid JSON', 400);
  }
  
  next();
};

export const validateInviteCodeRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { code, phone_number } = req.body;
  
  // Check if both fields are present and are non-empty strings
  if (!code || typeof code !== 'string' || code.trim().length === 0 ||
      !phone_number || typeof phone_number !== 'string' || phone_number.trim().length === 0) {
    throw new AppError('Code and phone number are required', 400);
  }
  
  next();
};