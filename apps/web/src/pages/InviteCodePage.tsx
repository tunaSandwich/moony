import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { authApi } from '@/api';

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
      
      // Navigate to next step (you can add a success page or dashboard)
      navigate('/dashboard'); // You'll need to create this route
      
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
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-pink-200 flex items-center justify-center px-6">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md shadow-xl border border-white/20">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-light text-white mb-2">
            Enter Invite Code
          </h1>
          <p className="text-white/80 text-sm">
            Enter your invitation code to get started with Budget Pal
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-200 text-sm">{error}</p>
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
              className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent backdrop-blur-sm"
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
              className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent backdrop-blur-sm"
              required
            />
          </div>

          <div className="space-y-3">
            <Button
              type="submit"
              disabled={!inviteCode.trim() || !phoneNumber.trim() || isLoading}
              isLoading={isLoading}
              className="w-full bg-white/20 text-white border-white/30 hover:bg-white/30 backdrop-blur-sm rounded-lg font-medium"
              size="lg"
            >
              Continue
            </Button>

            <Button
              type="button"
              onClick={handleBack}
              variant="ghost"
              className="w-full text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
              size="lg"
            >
              Back to Home
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InviteCodePage;