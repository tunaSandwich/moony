import React, { useState, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { plaidApi } from '../api/plaid';
import { Button } from './ui/Button';

export interface PlaidLinkProps {
  onSuccess: (hasConnectedBank: boolean) => void;
  onError: (error: string) => void;
}

export const PlaidLink: React.FC<PlaidLinkProps> = ({ onSuccess, onError }) => {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Initialize Plaid Link
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: useCallback(async (publicToken: string) => {
      setIsConnecting(true);
      try {
        console.log('Plaid Link success, exchanging token...');
        const result = await plaidApi.connectAccount(publicToken);
        console.log('Bank connected successfully:', result);
        onSuccess(result.hasConnectedBank);
      } catch (error) {
        console.error('Failed to connect bank account:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to connect bank account';
        onError(errorMessage);
      } finally {
        setIsConnecting(false);
      }
    }, [onSuccess, onError]),
    onExit: useCallback((error) => {
      console.log('Plaid Link exited');
      if (error) {
        console.error('Plaid Link error:', error);
        onError(`Plaid Link error: ${error.error_message || 'Unknown error'}`);
      }
    }, [onError]),
  });

  const handleGetLinkToken = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('Creating Plaid link token...');
      const tokenData = await plaidApi.createLinkToken();
      console.log('Link token created successfully');
      setLinkToken(tokenData.link_token);
    } catch (error) {
      console.error('Failed to create link token:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create link token';
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  const handleOpenPlaidLink = useCallback(() => {
    if (ready && linkToken) {
      console.log('Opening Plaid Link...');
      open();
    }
  }, [ready, linkToken, open]);

  // Auto-open Plaid Link when token is ready
  React.useEffect(() => {
    if (ready && linkToken && !isConnecting) {
      handleOpenPlaidLink();
    }
  }, [ready, linkToken, isConnecting, handleOpenPlaidLink]);

  return (
    <div className="flex flex-col items-center space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Connect Your Bank Account</h2>
      <p className="text-gray-600 text-center max-w-md">
        Securely connect your bank account to start tracking your daily spending. 
        We use Plaid's secure platform to protect your information.
      </p>
      
      {!linkToken ? (
        <Button 
          onClick={handleGetLinkToken}
          disabled={isLoading}
          className="w-full max-w-sm"
        >
          {isLoading ? 'Preparing Connection...' : 'Connect Bank Account'}
        </Button>
      ) : (
        <div className="text-center space-y-2">
          <div className="text-sm text-gray-600">
            {isConnecting ? 'Connecting your bank account...' : 'Opening bank connection...'}
          </div>
          {isConnecting && (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          )}
        </div>
      )}

      <div className="text-xs text-gray-500 max-w-sm text-center">
        <p>
          🔒 Your data is encrypted and secure. We use bank-level security 
          and never store your login credentials.
        </p>
      </div>
    </div>
  );
};