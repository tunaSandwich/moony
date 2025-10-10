import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger } from '@logger';
import { 
  globalErrorHandler, 
  notFoundHandler 
} from '../middleware/errorHandler.js';
import { 
  requestLogger, 
  securityHeaders,
  generalRateLimit 
} from '../middleware/security.js';
import routes from '../routes/index.js';

// Load environment-specific configuration
const nodeEnv = process.env.NODE_ENV || 'local';
dotenv.config({ path: `.env.${nodeEnv}` });
dotenv.config({ path: '.env' }); // fallback for shared variables

export const createApp = (): express.Application => {
  const app = express();

  // Trust proxy for accurate IP addresses (important for rate limiting)
  app.set('trust proxy', 1);

  // Security middleware
  app.use(securityHeaders);
  app.use(generalRateLimit);

  // CORS configuration
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Request parsing (capture raw body for webhook verification)
  app.use(express.json({ 
    limit: '10mb',
    strict: true,
    verify: (req, _res, buf) => {
      try {
        // Store raw body for routes that need it (e.g., Plaid webhook verification)
        (req as any).rawBody = buf.toString('utf8');
      } catch {
        // noop
      }
    }
  }));
  
  app.use(express.urlencoded({ 
    extended: true, 
    limit: '10mb' 
  }));

  // Logging middleware
  app.use(requestLogger);

  // Routes
  app.use('/', routes);

  // Error handling (must be last)
  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  return app;
};

export const getServerConfig = () => {
  const PORT = Number(process.env.PORT || 3000);
  const HOST = process.env.HOST || '0.0.0.0';
  const NODE_ENV = process.env.NODE_ENV || 'local';

  // Validate configuration
  if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
    throw new Error(`Invalid PORT: ${process.env.PORT}. Must be a number between 1 and 65535.`);
  }

  logger.info('Server configuration loaded', {
    PORT,
    HOST,
    NODE_ENV,
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  });

  return { PORT, HOST, NODE_ENV };
};
