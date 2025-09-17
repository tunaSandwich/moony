import { createApp, getServerConfig } from './src/config/app.js';
import { logger } from '../../packages/utils/logger.js';

async function startServer(): Promise<void> {
  try {
    // Create Express application
    const app = createApp();
    
    // Get server configuration
    const { PORT, HOST } = getServerConfig();

    // Start server
    const server = app.listen(PORT, HOST, () => {
      logger.info(`🚀 Server started successfully`, {
        port: PORT,
        host: HOST,
        environment: process.env.NODE_ENV || 'development',
        url: `http://${HOST}:${PORT}`,
      });
      
      logger.info('📋 Available endpoints:', {
        health: `http://${HOST}:${PORT}/health`,
        ready: `http://${HOST}:${PORT}/ready`,
        createLinkToken: `http://${HOST}:${PORT}/api/create_link_token`,
        exchangeToken: `http://${HOST}:${PORT}/api/exchange_public_token`,
        runJob: `http://${HOST}:${PORT}/api/run-now`,
      });
    });

    // Graceful shutdown handling
    const gracefulShutdown = (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      
      server.close((err) => {
        if (err) {
          logger.error('Error during server shutdown:', err);
          process.exit(1);
        }
        
        logger.info('Server closed successfully');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

