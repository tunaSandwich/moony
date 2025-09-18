import apiClient, { setToken } from './client';
import type {
  ValidateInviteCodeRequest,
  ValidateInviteCodeResponse,
  ConnectPlaidAccountRequest,
  ConnectPlaidAccountResponse,
} from './types';

// Authentication API service
export const authApi = {
  /**
   * Validate invite code and phone number
   * POST /api/invite-codes/validate
   */
  async validateInviteCode(code: string, phoneNumber: string): Promise<ValidateInviteCodeResponse> {
    try {
      const requestData: ValidateInviteCodeRequest = {
        code,
        phone_number: phoneNumber,
      };

      const response = await apiClient.post<ValidateInviteCodeResponse>(
        '/api/invite-codes/validate',
        requestData
      );

      // Automatically store the JWT token
      if (response.data.token) {
        setToken(response.data.token);
      }

      return response.data;
    } catch (error) {
      // Error handling is done in the axios interceptor
      throw error;
    }
  },

  /**
   * Connect Plaid bank account
   * POST /api/plaid/connect
   */
  async connectPlaidAccount(publicToken: string): Promise<ConnectPlaidAccountResponse> {
    try {
      const requestData: ConnectPlaidAccountRequest = {
        public_token: publicToken,
      };

      const response = await apiClient.post<ConnectPlaidAccountResponse>(
        '/api/plaid/connect',
        requestData
      );

      return response.data;
    } catch (error) {
      // Error handling is done in the axios interceptor
      throw error;
    }
  },
};