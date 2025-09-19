import { Request, Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CustomRequest extends Request {
  userId?: string;
  startTime?: number;
}

export interface CustomResponse extends Response {
  locals: {
    startTime?: number;
  };
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    plaid: boolean;
    database?: boolean;
  };
}

export interface LinkTokenRequest {
  // No body parameters needed - userId extracted from JWT
}

export interface ExchangeTokenRequest {
  public_token: string;
}

export interface RunJobResponse {
  ok: boolean;
  started: boolean;
  jobId?: string;
}