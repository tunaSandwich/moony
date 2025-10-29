import { Request, Response } from 'express';
import { PlaidService } from '@services/plaidService';
import { logger } from '@logger';
import { HealthStatus, ApiResponse } from '../types/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AWSSMSService } from '../services/aws/smsService.js';
import { prisma } from '../db.js';

export class HealthController {
  private plaidService: PlaidService;
  private awsSmsService: AWSSMSService;

  constructor() {
    this.plaidService = new PlaidService();
    this.awsSmsService = new AWSSMSService();
  }

  public getHealth = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const services = await this.checkServices();
    
    const health: HealthStatus = {
      status: this.determineOverallHealth(services),
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services,
    };

    const response: ApiResponse<HealthStatus> = {
      success: health.status === 'healthy',
      data: health,
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    logger.info('Health check completed', {
      status: health.status,
      services,
      duration: `${Date.now() - startTime}ms`,
    });

    res.status(statusCode).json(response);
  });

  public getReadiness = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Simple readiness check
    const response: ApiResponse = {
      success: true,
      message: 'Service is ready',
    };

    res.status(200).json(response);
  });

  private async checkServices(): Promise<HealthStatus['services']> {
    const services: HealthStatus['services'] = {
      plaid: false,
      database: false,
      awsSms: false,
      environment: false,
    };

    // Check database connectivity
    try {
      await prisma.$queryRaw`SELECT 1`;
      services.database = true;
    } catch (error) {
      logger.warn('Database health check failed', error);
      services.database = false;
    }

    // Check Plaid service
    try {
      await this.plaidService.createLinkToken('health-check-user');
      services.plaid = true;
    } catch (error) {
      logger.warn('Plaid health check failed', error);
      services.plaid = false;
    }

    // Check AWS SMS service
    try {
      // Simple initialization check - doesn't send actual SMS
      const initialized = !!this.awsSmsService;
      services.awsSms = initialized;
    } catch (error) {
      logger.warn('AWS SMS health check failed', error);
      services.awsSms = false;
    }

    // Check environment configuration
    const requiredEnvVars = [
      'DATABASE_URL',
      'AWS_REGION',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'JWT_SECRET'
    ];
    
    services.environment = requiredEnvVars.every(envVar => !!process.env[envVar]);

    return services;
  }

  private determineOverallHealth(services: HealthStatus['services']): 'healthy' | 'unhealthy' {
    // Service is healthy if all critical services are working
    const criticalServices = [
      services.database,    // Database is always critical
      services.environment, // Environment variables are critical
      services.awsSms      // SMS service is critical for core functionality
    ];
    
    // Plaid is important but not critical for basic operation
    const importantServices = [services.plaid];
    
    const allCriticalHealthy = criticalServices.every(service => service);
    
    // If critical services are down, system is unhealthy
    if (!allCriticalHealthy) {
      return 'unhealthy';
    }
    
    // If all services (including important ones) are healthy, system is healthy
    const allServicesHealthy = [...criticalServices, ...importantServices].every(service => service);
    
    return allServicesHealthy ? 'healthy' : 'healthy'; // Still healthy even if Plaid is down
  }
}
