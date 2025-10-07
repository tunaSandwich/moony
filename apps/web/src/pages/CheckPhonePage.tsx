import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { TopBar } from '@/components/ui/TopBar';
import { Header } from '@/components';

const CheckPhonePage = () => {
  const [showResend, setShowResend] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Show resend button after 45 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowResend(true);
    }, 45000); // 45 seconds

    return () => clearTimeout(timer);
  }, []);

  const handleResendMessage = async () => {
    setIsResending(true);
    setResendError(null);
    
    try {
      const response = await fetch('/api/twilio/resend-welcome', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to resend message');
      }
      
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 3000);
    } catch (error) {
      setResendError(error instanceof Error ? error.message : 'Failed to resend message');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{backgroundColor: '#FFF8FC'}}>
      {/* Fixed Header with Logo */}
      <Header />

      {/* Main Content */}
      <div className="flex items-center justify-center px-6" style={{ paddingTop: '80px', minHeight: '100vh' }}>
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md shadow-xl border border-white/20">
          <TopBar radiusMode="inherit" />
          
          {/* Main Content */}
          <div className="text-center space-y-8">
            {/* Icon with pulse indicator */}
            <div className="flex justify-center">
              <div className="relative inline-block">
                <div className="text-7xl animate-bounce-slow">📱</div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              </div>
            </div>

            {/* Header */}
            <div className="space-y-3">
              <h1 className="text-3xl font-light" style={{ color: '#1E1E1E' }}>
                Check Your Phone
              </h1>
              <p className="text-base" style={{ color: '#1E1E1E', opacity: 0.8 }}>
                We just sent you a message
              </p>
            </div>

            {/* Timing expectations */}
            <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
              <p className="text-sm font-medium" style={{ color: '#1E1E1E' }}>
                💡 Message usually arrives within <strong>30 seconds</strong>
              </p>
              <p className="text-xs mt-2" style={{ color: '#1E1E1E', opacity: 0.7 }}>
                Can take up to 2 minutes depending on your carrier
              </p>
            </div>

            {/* Resend and support options (appears after 45 seconds) */}
            {showResend && (
              <div className="space-y-6 animate-fade-in">
                {/* Resend section */}
                <div className="space-y-3">
                  <p className="text-sm" style={{ color: '#1E1E1E', opacity: 0.8 }}>
                    Haven't received it yet?{' '}
                    <button
                      onClick={handleResendMessage}
                      disabled={isResending}
                      className="underline hover:opacity-70 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ color: '#1E1E1E' }}
                    >
                      {isResending ? 'Sending...' : 'Resend message'}
                    </button>
                  </p>
                  
                  {resendSuccess && (
                    <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3">
                      <p className="text-sm font-medium" style={{ color: '#22c55e' }}>
                        ✓ Message sent! Check your phone.
                      </p>
                    </div>
                  )}
                  
                  {resendError && (
                    <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                      <p className="text-sm text-red-700">{resendError}</p>
                    </div>
                  )}
                </div>

                {/* Troubleshooting tips */}
                <div className="bg-white/5 rounded-lg p-4 border border-white/10 text-left space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-3" style={{ color: '#1E1E1E' }}>
                      🔍 Troubleshooting tips:
                    </h3>
                    <ul className="text-xs space-y-2" style={{ color: '#1E1E1E', opacity: 0.8 }}>
                      <li>• Look in spam/blocked message folders</li>
                      <li>• Make sure you have cell signal or internet</li>
                    </ul>
                  </div>
                  
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-xs text-center" style={{ color: '#1E1E1E', opacity: 0.7 }}>
                      Still having trouble? Contact{' '}
                      <a 
                        href="mailto:gonzalezgarza.lucas@gmail.com?subject=moony%20-%20Welcome%20Message%20Not%20Received"
                        className="hover:opacity-70 transition-opacity"
                        style={{ color: '#1E1E1E', textDecoration: 'none' }}
                      >
                        gonzalezgarza.lucas@gmail.com
                      </a>
                    </p>
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

export default CheckPhonePage;
