/* eslint-disable no-useless-catch */
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
  async sendVerificationCode(phoneNumber?: string): Promise<SendVerificationCodeResponse> {
    try {
      const requestData = phoneNumber ? { phoneNumber } : {};
      
      const response = await apiClient.post<SendVerificationCodeResponse>(
        '/api/twilio/send-code',
        requestData
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

  /**
   * Resend welcome message for verified users
   * POST /api/twilio/resend-welcome
   */
  async resendWelcomeMessage(): Promise<{ message: string }> {
    try {
      const response = await apiClient.post<{ message: string }>(
        '/api/twilio/resend-welcome'
      );

      return response.data;
    } catch (error) {
      // Error handling is done in the axios interceptor
      throw error;
    }
  },
};
