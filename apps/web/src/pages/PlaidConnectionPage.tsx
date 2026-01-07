import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlaidLink } from 'react-plaid-link';
import { Button } from '@/components/ui/Button';
import { TopBar } from '@/components/ui/TopBar';
import { plaidApi } from '@/api/plaid';
import { Header } from '@/components';

const PlaidConnectionPage = () => {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Initialize Plaid Link
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: useCallback(async (publicToken: string) => {
      setIsConnecting(true);
      setError('');
      
      try {
        await plaidApi.connectAccount(publicToken);
        
        // Clear link token to prevent re-launch bug
        setLinkToken(null);
        
        // Show success message
        setIsConnecting(false);
        setShowSuccess(true);
        
      } catch (error) {
        console.error('Failed to connect bank account:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to connect your bank account. Please try again.';
        setError(errorMessage);
        setIsConnecting(false);
      }
    }, []),

    onExit: useCallback((error: unknown) => {
      setIsConnecting(false);
      setLinkToken(null);  // Clear link token to return to initial state
      setError('');        // Clear any error messages
      if (error) {
        console.error('Plaid Link error:', error);
      }
    }, []),
  });

  const handleStartConnection = useCallback(async () => {
    setIsInitializing(true);
    setError('');
    
    try {
      const tokenData = await plaidApi.createLinkToken();
      setLinkToken(tokenData.link_token);
    } catch (error) {
      console.error('Failed to create link token:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unable to initialize bank connection. Please try again.';
      setError(errorMessage);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  // Auto-open Plaid Link when token is ready
  useEffect(() => {
    if (ready && linkToken && !isConnecting) {
      open();
    }
  }, [ready, linkToken, isConnecting, open]);

  return (
    <div className="min-h-screen relative overflow-hidden" style={{backgroundColor: '#FFF8FC'}}>
      {/* Fixed Header with Logo - Consistent with Landing Page */}

      <Header />

      {/* Main Content with Padding for Header */}
      <div className="flex items-center justify-center px-6" style={{ paddingTop: '80px', minHeight: '100vh' }}>
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md shadow-xl border border-white/20">
        <TopBar radiusMode="inherit" />
        <div className="text-center mb-8">
          <h1 className="text-3xl font-light mb-2" style={{ color: '#1E1E1E' }}>
            {showSuccess ? 'Bank Connected Successfully!' : 'Connect Your Bank'}
          </h1>
          {!showSuccess && (
            <p className="text-sm" style={{ color: '#1E1E1E', opacity: 0.8 }}>
              Securely connect your bank account to start tracking your daily spending
            </p>
          )}
        </div>

        <div className="space-y-6">
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {!linkToken && !isConnecting && !showSuccess && (
            <div className="space-y-4">
              <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                <div className="flex items-center text-sm space-x-2 mb-3" style={{ color: '#1E1E1E' }}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Bank-level security</span>
                </div>
                <ul className="text-xs space-y-1" style={{ color: '#1E1E1E', opacity: 0.8 }}>
                  <li>• We never store your banking passwords</li>
                  <li>• Your data is encrypted and secure</li>
                  <li>• Powered by Plaid, trusted by millions</li>
                </ul>
              </div>

              <Button
                onClick={handleStartConnection}
                disabled={isInitializing}
                isLoading={isInitializing}
                className="w-full bg-white/80 border-gray-300 hover:bg-white/90 backdrop-blur-sm rounded-lg font-medium"
                style={{ color: '#1E1E1E' }}
                size="lg"
              >
                {isInitializing ? 'Preparing Connection...' : 'Connect Bank Account'}
              </Button>
            </div>
          )}

          {linkToken && !isConnecting && (
            <div className="text-center space-y-4">
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3">
                <p className="text-sm" style={{ color: '#1E1E1E' }}>
                  {ready ? 'Opening bank connection…' : 'Preparing bank connection…'}
                </p>
              </div>
              <div className="flex justify-center">
                <svg className="animate-spin h-5 w-5" style={{ color: '#1E1E1E' }} viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            </div>
          )}

          {isConnecting && (
            <div className="text-center space-y-4">
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-center justify-center space-x-3">
                  <svg className="animate-spin h-5 w-5" style={{ color: '#1E1E1E' }} viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-sm font-medium" style={{ color: '#1E1E1E' }}>Connecting your bank account...</span>
                </div>
              </div>
            </div>
          )}

          {showSuccess && (
            <div className="text-center space-y-8 animate-fade-in">
              {/* Success Icon with subtle scale animation */}
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center animate-scale-in">
                  <svg className="w-10 h-10" style={{ color: '#22c55e' }} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>

              {/* Next Button */}
              <Button
                onClick={() => navigate('/phone-verification')}
                className="w-full bg-white/80 border-gray-300 hover:bg-white/90 backdrop-blur-sm rounded-lg font-medium"
                style={{ color: '#1E1E1E' }}
                size="lg"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
};

export default PlaidConnectionPage;
