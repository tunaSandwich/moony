import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlaidLink } from 'react-plaid-link';
import { Button } from '@/components/ui/Button';
import { plaidApi } from '@/api/plaid';
import logoText from '@/assets/icons/logo_text.png';

const PlaidConnectionPage = () => {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Initialize Plaid Link
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: useCallback(async (publicToken: string) => {
      setIsConnecting(true);
      setError('');
      
      try {
        console.log('Plaid Link success, exchanging token...');
        const result = await plaidApi.connectAccount(publicToken);
        console.log('Bank connected successfully:', result);
        
        // Navigate to phone verification step
        navigate('/phone-verification');
        
      } catch (error) {
        console.error('Failed to connect bank account:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to connect your bank account. Please try again.';
        setError(errorMessage);
        setIsConnecting(false);
      }
    }, [navigate]),
    onExit: useCallback((error: unknown) => {
      console.log('Plaid Link exited');
      setIsConnecting(false);
      if (error) {
        console.error('Plaid Link error:', error);
        setError('Connection was cancelled. Please try again to continue.');
      }
    }, []),
  });

  const handleStartConnection = useCallback(async () => {
    setIsInitializing(true);
    setError('');
    
    try {
      console.log('Creating Plaid link token...');
      const tokenData = await plaidApi.createLinkToken();
      console.log('Link token created successfully');
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
      console.log('Opening Plaid Link...');
      open();
    }
  }, [ready, linkToken, isConnecting, open]);

  return (
    <div className="min-h-screen relative overflow-hidden" style={{backgroundColor: '#FFF8FC'}}>
      {/* Fixed Header with Logo - Consistent with Landing Page */}
      <header 
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-[25px]"
        style={{
          height: '60px',
          background: 'linear-gradient(to bottom, rgba(255, 248, 252, 0.9) 0%, rgba(255, 248, 252, 0.5) 50%, rgba(255, 248, 252, 0) 100%)',
        }}
      >
        <div className="absolute top-4 left-20 z-10">
          <img 
            src={logoText} 
            alt="Moony Logo" 
            className="w-20 h-auto"
          />
        </div>
      </header>

      {/* Main Content with Padding for Header */}
      <div className="flex items-center justify-center px-6" style={{ paddingTop: '80px', minHeight: '100vh' }}>
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md shadow-xl border border-white/20">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-light text-white mb-2">
            Connect Your Bank
          </h1>
          <p className="text-white/80 text-sm">
            Securely connect your bank account to start tracking your daily spending
          </p>
        </div>

        <div className="space-y-6">
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          {!linkToken && !isConnecting && (
            <div className="space-y-4">
              <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                <div className="flex items-center text-white/90 text-sm space-x-2 mb-3">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Bank-level security</span>
                </div>
                <ul className="text-white/70 text-xs space-y-1">
                  <li>• We never store your banking passwords</li>
                  <li>• Your data is encrypted and secure</li>
                  <li>• Powered by Plaid, trusted by millions</li>
                </ul>
              </div>

              <Button
                onClick={handleStartConnection}
                disabled={isInitializing}
                isLoading={isInitializing}
                className="w-full bg-white/20 text-white border-white/30 hover:bg-white/30 backdrop-blur-sm rounded-lg font-medium"
                size="lg"
              >
                {isInitializing ? 'Preparing Connection...' : 'Connect Bank Account'}
              </Button>
            </div>
          )}

          {linkToken && !isConnecting && (
            <div className="text-center space-y-4">
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3">
                <p className="text-green-200 text-sm">
                  {ready ? 'Opening bank connection…' : 'Preparing bank connection…'}
                </p>
              </div>
              <div className="flex justify-center">
                <svg className="animate-spin h-5 w-5 text-green-200" viewBox="0 0 24 24" fill="none">
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
                  <svg className="animate-spin h-5 w-5 text-blue-200" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-blue-200 text-sm font-medium">Connecting your bank account...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
};

export default PlaidConnectionPage;
