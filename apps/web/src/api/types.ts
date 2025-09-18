// API Request/Response Types - matching backend contracts exactly

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  hasConnectedBank: boolean;
  twilioStatus: 'verified' | 'unverified';
}

export interface ApiError {
  success: false;
  error: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

// Auth API Types
export interface ValidateInviteCodeRequest {
  code: string;
  phone_number: string;
}

export interface ValidateInviteCodeResponse {
  user: User;
  token: string;
}

// Plaid API Types
export interface ConnectPlaidAccountRequest {
  public_token: string;
}

export interface ConnectPlaidAccountResponse {
  message: string;
  hasConnectedBank: boolean;
}

// Twilio API Types
export interface SendVerificationCodeResponse {
  message: string;
}

export interface VerifyPhoneNumberRequest {
  code: string;
}

export interface VerifyPhoneNumberResponse {
  message: string;
  twilioStatus: 'verified';
}

// Error mapping for user-friendly messages
export const ERROR_MESSAGES: Record<string, string> = {
  'Invalid invite code or phone number': 'Please check your invite code and phone number',
  'Unable to send verification code. Please try again.': 'Couldn\'t send SMS. Please try again',
  'Invalid verification code': 'That code didn\'t work. Please try again',
  'Verification code has expired. Please request a new code.': 'Your code expired. Request a new one',
  'Phone number is already verified': 'Your phone number is already verified',
  'User not found': 'User not found. Please check your information',
  'Invalid or expired token': 'Your session has expired. Please log in again',
  'Verification code is required': 'Please enter the verification code',
};

// Network error fallback
export const NETWORK_ERROR_MESSAGE = 'Network error. Please check your connection and try again';
export const UNKNOWN_ERROR_MESSAGE = 'Something went wrong. Please try again';