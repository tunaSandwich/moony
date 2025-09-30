// Example: How to use the moony API in React components
import { useState } from 'react';
import { authApi, twilioApi } from '@/api';

// Example 1: Simple invite code validation
export const LoginExample = () => {
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  const handleLogin = async (code: string, phone: string) => {
    try {
      const response = await authApi.validateInviteCode(code, phone);
      setUser(response.user);
      setError('');
      // Token is automatically stored in localStorage
    } catch (error) {
      setError(error.message); // User-friendly message
    }
  };

  return { user, error, handleLogin };
};

// Example 2: SMS verification flow
export const SmsVerificationExample = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const sendCode = async () => {
    setIsLoading(true);
    try {
      const response = await twilioApi.sendVerificationCode();
      setMessage(response.message);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCode = async (code: string) => {
    setIsLoading(true);
    try {
      const response = await twilioApi.verifyPhoneNumber(code);
      setMessage(`Success: ${response.message}`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return { isLoading, message, sendCode, verifyCode };
};

// Example 3: Bank connection
export const BankConnectionExample = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('');

  const connectBank = async (publicToken: string) => {
    setIsConnecting(true);
    try {
      const response = await authApi.connectPlaidAccount(publicToken);
      setConnectionStatus(response.message);
    } catch (error) {
      setConnectionStatus(error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  return { isConnecting, connectionStatus, connectBank };
};

// Example 4: Complete component with error handling
export const CompleteExampleComponent = () => {
  const [step, setStep] = useState(1);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInviteValidation = async (code: string, phone: string) => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await authApi.validateInviteCode(code, phone);
      setUser(response.user);
      setStep(2); // Move to next step
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendVerification = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      await twilioApi.sendVerificationCode();
      setStep(3); // Move to verification step
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneVerification = async (code: string) => {
    setIsLoading(true);
    setError('');
    
    try {
      await twilioApi.verifyPhoneNumber(code);
      setStep(4); // Move to final step
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    step,
    user,
    error,
    isLoading,
    handleInviteValidation,
    handleSendVerification,
    handlePhoneVerification,
  };
};
