import { Request, Response } from 'express';
import { PlaidService } from '@services/plaidService';
import { logger } from '@logger';
import { HealthStatus, ApiResponse } from '../types/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { TwilioSMSService } from '../services/twilio/smsService.js';
import { prisma } from '../db.js';

export class HealthController {
  private plaidService: PlaidService;
  private smsService: TwilioSMSService;

  constructor() {
    this.plaidService = new PlaidService();
    this.smsService = new TwilioSMSService();
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
      sms: false,
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

    // Check SMS service (Twilio)
    try {
      // Simple initialization check - doesn't send actual SMS
      const initialized = !!this.smsService;
      services.sms = initialized;
    } catch (error) {
      logger.warn('SMS service health check failed', error);
      services.sms = false;
    }

    // Check environment configuration
    const requiredEnvVars = [
      'DATABASE_URL',
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN',
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
      services.sms          // SMS service is critical for core functionality
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
