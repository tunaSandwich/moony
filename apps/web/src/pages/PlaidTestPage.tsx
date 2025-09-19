import React, { useState } from 'react';
import { PlaidLink } from '../components';
import { Button } from '../components/ui/Button';

export const PlaidTestPage: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [hasConnectedBank, setHasConnectedBank] = useState<boolean>(false);

  const handleSuccess = (connected: boolean) => {
    setStatus('success');
    setHasConnectedBank(connected);
    setMessage('Bank account connected successfully! 🎉');
    console.log('PlaidLink success - Bank connected:', connected);
  };

  const handleError = (error: string) => {
    setStatus('error');
    setMessage(`Error: ${error}`);
    console.error('PlaidLink error:', error);
  };

  const handleStartOver = () => {
    setStatus('idle');
    setMessage('');
    setHasConnectedBank(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white shadow-md rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Plaid Integration Test
          </h1>

          {status === 'idle' && (
            <PlaidLink onSuccess={handleSuccess} onError={handleError} />
          )}

          {status === 'success' && (
            <div className="text-center space-y-4">
              <div className="text-green-600 text-lg font-medium">
                ✅ Success!
              </div>
              <p className="text-gray-700">{message}</p>
              <div className="text-sm text-gray-600">
                Bank Connected: {hasConnectedBank ? 'Yes' : 'No'}
              </div>
              <Button onClick={handleStartOver} variant="outline" className="w-full">
                Test Again
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center space-y-4">
              <div className="text-red-600 text-lg font-medium">
                ❌ Error
              </div>
              <p className="text-red-700 bg-red-50 p-3 rounded border text-sm">
                {message}
              </p>
              <Button onClick={handleStartOver} variant="outline" className="w-full">
                Try Again
              </Button>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="font-medium text-gray-900 mb-3">Test Requirements:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Valid JWT token in localStorage</li>
              <li>• Backend server running on localhost:3000</li>
              <li>• Plaid credentials configured</li>
              <li>• Network connection available</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};