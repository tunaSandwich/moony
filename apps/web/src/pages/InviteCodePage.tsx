import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { authApi } from '@/api';
import logoText from '@/assets/icons/logo_text.png';

const InviteCodePage = () => {
  const [inviteCode, setInviteCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim() || !phoneNumber.trim()) return;

    setIsLoading(true);
    setError('');
    
    try {
      // Call the API to validate invite code
      const response = await authApi.validateInviteCode(inviteCode, phoneNumber);
      
      console.log('User authenticated:', response.user);
      console.log('Token stored successfully');
      
      // Navigate to bank connection step
      navigate('/connect-bank');
      
    } catch (error) {
      // Error is already user-friendly thanks to our interceptor
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

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
            alt="Budget Pal Logo" 
            className="w-20 h-auto"
          />
        </div>
      </header>

      {/* Main Content with Padding for Header */}
      <div className="flex items-center justify-center px-6" style={{ paddingTop: '80px', minHeight: '100vh' }}>
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md shadow-xl border border-white/20">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-light mb-2" style={{ color: '#1E1E1E' }}>
            Enter Invite Code
          </h1>
          <p className="text-sm" style={{ color: '#1E1E1E', opacity: 0.8 }}>
            Enter your invitation code to get started with Budget Pal
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}
          
          <div>
            <label htmlFor="inviteCode" className="sr-only">
              Invite Code
            </label>
            <input
              id="inviteCode"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter invite code"
              className="w-full px-4 py-3 bg-white/70 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent backdrop-blur-sm"
              style={{ color: '#1E1E1E' }}
              required
            />
          </div>

          <div>
            <label htmlFor="phoneNumber" className="sr-only">
              Phone Number
            </label>
            <input
              id="phoneNumber"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Enter phone number (e.g., +15551234567)"
              className="w-full px-4 py-3 bg-white/70 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent backdrop-blur-sm"
              style={{ color: '#1E1E1E' }}
              required
            />
          </div>

          <div className="space-y-3">
            <Button
              type="submit"
              disabled={!inviteCode.trim() || !phoneNumber.trim() || isLoading}
              isLoading={isLoading}
              className="w-full bg-white/80 border-gray-300 hover:bg-white/90 backdrop-blur-sm rounded-lg font-medium"
              style={{ color: '#1E1E1E' }}
              size="lg"
            >
              Continue
            </Button>

            <Button
              type="button"
              onClick={handleBack}
              variant="ghost"
              className="w-full hover:bg-white/20 rounded-lg"
              style={{ color: '#1E1E1E' }}
              size="lg"
            >
              Back to Home
            </Button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};

export default InviteCodePage;
