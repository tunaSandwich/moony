import apiClient, { setToken } from './client';
import type {
  ValidateInviteCodeRequest,
  ValidateInviteCodeResponse,
  ConnectPlaidAccountRequest,
  ConnectPlaidAccountResponse,
  SessionResponse,
} from './types';

// Authentication API service
export const authApi = {
  /**
   * Validate invite code and phone number
   * POST /api/invite-codes/validate
   * Sets httpOnly cookie on the backend; also stores token in localStorage as fallback.
   */
  async validateInviteCode(code: string, phoneNumber: string): Promise<ValidateInviteCodeResponse> {
    const requestData: ValidateInviteCodeRequest = {
      code,
      phone_number: phoneNumber,
    };

    const response = await apiClient.post<ValidateInviteCodeResponse>(
      '/api/invite-codes/validate',
      requestData
    );

    // Store token in localStorage as fallback (httpOnly cookie is the primary mechanism)
    if (response.data.token) {
      setToken(response.data.token);
    }

    return response.data;
  },

  /**
   * Get current session and onboarding state
   * GET /api/auth/session
   */
  async getSession(): Promise<SessionResponse> {
    const response = await apiClient.get<{ data: SessionResponse }>('/api/auth/session');
    return response.data.data;
  },

  /**
   * Logout - clears httpOnly cookie on backend
   * POST /api/auth/logout
   */
  async logout(): Promise<void> {
    await apiClient.post('/api/auth/logout');
  },

  /**
   * Connect Plaid bank account
   * POST /api/plaid/connect
   */
  async connectPlaidAccount(publicToken: string): Promise<ConnectPlaidAccountResponse> {
    const requestData: ConnectPlaidAccountRequest = {
      public_token: publicToken,
    };

    const response = await apiClient.post<ConnectPlaidAccountResponse>(
      '/api/plaid/connect',
      requestData
    );

    return response.data;
  },
};
