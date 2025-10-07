import { useState, useEffect } from 'react';
import { TopBar } from '@/components/ui/TopBar';
import { Header } from '@/components';
import { twilioApi } from '@/api/twilio';

const CheckPhonePage = () => {
  const [showResend, setShowResend] = useState(false);
  const [resendState, setResendState] = useState({
    isResending: false,
    success: false,
    error: null as string | null
  });

  // Show resend button after 45 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowResend(true);
    }, 45000); // 45 seconds

    return () => clearTimeout(timer);
  }, []);

  const handleResendMessage = async () => {
    setResendState({ isResending: true, success: false, error: null });
    
    try {
      // Call the backend to resend the welcome SMS
      await twilioApi.resendWelcomeMessage();
      
      setResendState({ isResending: false, success: true, error: null });
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setResendState(prev => ({ ...prev, success: false }));
      }, 5000);
      
    } catch (error) {
      console.error('Failed to resend message:', error);
      setResendState({ 
        isResending: false, 
        success: false, 
        error: 'Failed to resend. Please try again or contact support.' 
      });
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
                <div className="text-7xl animate-bounce-slow mt-5">📱</div>
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
                      disabled={resendState.isResending}
                      className="underline hover:opacity-70 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ color: '#1E1E1E' }}
                    >
                      {resendState.isResending ? 'Sending...' : 'Resend message'}
                    </button>
                  </p>
                  
                  {resendState.success && (
                    <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3">
                      <p className="text-sm font-medium" style={{ color: '#22c55e' }}>
                        ✓ Message sent! Check your phone.
                      </p>
                    </div>
                  )}
                  
                  {resendState.error && (
                    <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                      <p className="text-sm text-red-700">{resendState.error}</p>
                    </div>
                  )}
                </div>

                {/* Troubleshooting tips */}
                <div className="bg-white/5 rounded-lg p-4 border border-white/10 text-left space-y-4">                  
                  <p className="text-xs text-center" style={{ color: '#1E1E1E', opacity: 0.7 }}>
                    Still having trouble?
                    <br />
                    Contact gonzalezgarza.lucas@gmail.com
                  </p>
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
