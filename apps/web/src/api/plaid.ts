import apiClient from './client';
import type { ApiSuccess, ConnectPlaidAccountRequest, ConnectPlaidAccountResponse } from './types';

// Plaid API Types
export interface CreateLinkTokenResponse {
  link_token: string;
}

export interface CreateLinkTokenApiResponse extends ApiSuccess<CreateLinkTokenResponse> {
  message: string;
}

// API Functions
export const plaidApi = {
  /**
   * Create a link token for Plaid Link initialization
   * Uses JWT authentication - no body parameters needed
   */
  async createLinkToken(): Promise<CreateLinkTokenResponse> {
    const response = await apiClient.post<CreateLinkTokenApiResponse>('/api/plaid/create_link_token');
    return response.data.data;
  },

  /**
   * Connect bank account using public token from Plaid Link
   */
  async connectAccount(publicToken: string): Promise<ConnectPlaidAccountResponse> {
    const request: ConnectPlaidAccountRequest = {
      public_token: publicToken,
    };
    
    const response = await apiClient.post<ConnectPlaidAccountResponse>('/api/plaid/connect', request);
    return response.data;
  },
};