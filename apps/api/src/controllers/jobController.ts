import { Request, Response } from 'express';
import { SchedulerService } from '@services/schedulerService';
import { logger } from '@logger';
import { ApiResponse, RunJobResponse } from '../types/index.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

export class JobController {
  private schedulerService: SchedulerService;

  constructor() {
    this.schedulerService = new SchedulerService();
  }

  public triggerDailyJob = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info('Manual job trigger requested', { 
      jobId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    try {
      // Fire-and-forget to avoid request timeouts
      setImmediate(() => {
        this.runJobAsync(jobId).catch(error => {
          logger.error('Async job execution failed', { jobId, error });
        });
      });

      const response: ApiResponse<RunJobResponse> = {
        success: true,
        data: {
          ok: true,
          started: true,
          jobId,
        },
        message: 'Daily job triggered successfully',
      };

      logger.info('Job trigger response sent', { jobId });
      res.status(202).json(response);
      
    } catch (error) {
      logger.error('Failed to trigger daily job', { jobId, error });
      throw new AppError('Failed to trigger daily job', 500);
    }
  });

  private async runJobAsync(jobId: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting async job execution', { jobId });
      
      await this.schedulerService.runDailyJob();
      
      const duration = Date.now() - startTime;
      logger.info('Async job completed successfully', { 
        jobId, 
        duration: `${duration}ms` 
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Async job failed', { 
        jobId, 
        duration: `${duration}ms`,
        error 
      });
      
      // In production, you might want to:
      // - Store job status in database
      // - Send notifications on failure
      // - Implement retry logic
    }
  }
}
