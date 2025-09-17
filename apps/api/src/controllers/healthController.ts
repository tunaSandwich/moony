import { Request, Response } from 'express';
import { PlaidService } from '@services/plaidService';
import { logger } from '@logger';
import { HealthStatus, ApiResponse } from '../types/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export class HealthController {
  private plaidService: PlaidService;

  constructor() {
    this.plaidService = new PlaidService();
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
    };

    try {
      // Check Plaid service by attempting to create a test link token
      await this.plaidService.createLinkToken('health-check-user');
      services.plaid = true;
    } catch (error) {
      logger.warn('Plaid health check failed', error);
      services.plaid = false;
    }

    return services;
  }

  private determineOverallHealth(services: HealthStatus['services']): 'healthy' | 'unhealthy' {
    // Service is healthy if all critical services are working
    const criticalServices = [services.plaid];
    return criticalServices.every(service => service) ? 'healthy' : 'unhealthy';
  }
}
