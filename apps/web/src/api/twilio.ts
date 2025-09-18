import apiClient from './client';
import type {
  SendVerificationCodeResponse,
  VerifyPhoneNumberRequest,
  VerifyPhoneNumberResponse,
} from './types';

// Twilio SMS verification API service
export const twilioApi = {
  /**
   * Send SMS verification code to user's phone number
   * POST /api/twilio/send-code
   */
  async sendVerificationCode(): Promise<SendVerificationCodeResponse> {
    try {
      const response = await apiClient.post<SendVerificationCodeResponse>(
        '/api/twilio/send-code'
      );

      return response.data;
    } catch (error) {
      // Error handling is done in the axios interceptor
      throw error;
    }
  },

  /**
   * Verify phone number with SMS verification code
   * POST /api/twilio/verify-number
   */
  async verifyPhoneNumber(code: string): Promise<VerifyPhoneNumberResponse> {
    try {
      const requestData: VerifyPhoneNumberRequest = {
        code,
      };

      const response = await apiClient.post<VerifyPhoneNumberResponse>(
        '/api/twilio/verify-number',
        requestData
      );

      return response.data;
    } catch (error) {
      // Error handling is done in the axios interceptor
      throw error;
    }
  },
};