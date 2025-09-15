export interface User {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  goalAmount: number;
  createdAt: string;
}

export interface BankConnection {
  id: string;
  institutionId: string;
  institutionName: string;
  accountId: string;
  accountName: string;
  accountType: string;
  accessToken: string;
  isConnected: boolean;
}

export interface OnboardingData {
  goalAmount: number;
  bankConnection: BankConnection;
  phoneNumber: string;
  smsConsent: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface FormError {
  field: string;
  message: string;
}