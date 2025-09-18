import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler.js';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
}

export const authenticateJWT = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new AppError('Authorization token required', 401);
  }

  const token = authHeader.split(' ')[1]; // Remove 'Bearer ' prefix

  if (!token) {
    throw new AppError('Authorization token required', 401);
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new AppError('JWT configuration error', 500);
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
    
    if (!decoded.user_id) {
      throw new AppError('Invalid or expired token', 401);
    }

    // Attach user information to request object
    req.user = {
      id: decoded.user_id,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('Invalid or expired token', 401);
    }
    throw error;
  }
};

// Type export for use in controllers
export type { AuthenticatedRequest };