import { Request, Response, NextFunction } from 'express';
import { logger } from '@logger';
import { AppError } from './errorHandler.js';

// Simple in-memory rate limiter (in production, use Redis)
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class MemoryRateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    
    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      // Create or reset entry
      this.store.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }

    if (entry.count >= this.maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

// Rate limiters for different endpoints
const generalLimiter = new MemoryRateLimiter(15 * 60 * 1000, 100); // 100 requests per 15 minutes
const plaidLimiter = new MemoryRateLimiter(60 * 1000, 10); // 10 requests per minute for Plaid endpoints
const jobLimiter = new MemoryRateLimiter(60 * 1000, 5); // 5 job triggers per minute

export const createRateLimiter = (limiter: MemoryRateLimiter) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `${req.ip}:${req.path}`;
    
    if (!limiter.isAllowed(key)) {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent'),
      });
      
      throw new AppError('Too many requests. Please try again later.', 429);
    }
    
    next();
  };
};

export const generalRateLimit = createRateLimiter(generalLimiter);
export const plaidRateLimit = createRateLimiter(plaidLimiter);
export const jobRateLimit = createRateLimiter(jobLimiter);

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  res.locals.startTime = startTime;

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.info('API Request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
  });

  next();
};

export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Don't expose server information
  res.removeHeader('X-Powered-By');
  
  next();
};
