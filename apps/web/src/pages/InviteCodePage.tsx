import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { TopBar } from '@/components/ui/TopBar';
import { Header } from '@/components';
import { authApi } from '@/api';
import { colors } from '@/design-system';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { validatePhoneNumber } from '@/utils/validators';

const InviteCodePage = () => {
  const [viewState, setViewState] = useState<'enter-code' | 'request-access' | 'confirmation'>('enter-code');
  const [inviteCode, setInviteCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [requestPhoneNumber, setRequestPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim() || !phoneNumber.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      setError('Please enter a valid phone number');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      // Call the API to validate invite code
      const response = await authApi.validateInviteCode(inviteCode, phoneNumber);
      
      if (import.meta.env.DEV) {
        console.log('User authenticated:', response.user);
        console.log('Token stored successfully');
      }
      
      // Navigate to bank connection step
      navigate('/connect-bank');
      
    } catch (error) {
      // Error is already user-friendly thanks to our interceptor
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !requestPhoneNumber.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (!validatePhoneNumber(requestPhoneNumber)) {
      setError('Please enter a valid phone number');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      // TODO: integrate EmailJS to notify admin
      console.log({ firstName, lastName, requestPhoneNumber });
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Transition to confirmation state
      setViewState('confirmation');
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-pink-bg">
      {/* Fixed Header with Logo - Consistent with Landing Page */}
      <Header />

      {/* Main Content with Padding for Header */}
      <div className="flex items-center justify-center px-6" style={{ paddingTop: '80px', minHeight: '100vh' }}>
        <div className="relative bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md shadow-xl border border-white/20">
          <TopBar radiusMode="inherit" />
          
          {/* Enter Code State */}
          {viewState === 'enter-code' && (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-light mb-2" style={{ color: colors.gray[900] }}>
                  Enter Invite Code
                </h1>
                <p className="text-sm" style={{ color: colors.gray[700] }}>
                  Enter your invitation code to get started with moony
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
                    style={{ color: colors.gray[900] }}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="phoneNumber" className="sr-only">
                    Phone Number
                  </label>
                  <PhoneInput
                    value={phoneNumber}
                    onChange={setPhoneNumber}
                    placeholder="Enter your phone number"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-3">
                  <Button
                    type="submit"
                    disabled={!inviteCode.trim() || !phoneNumber.trim() || !validatePhoneNumber(phoneNumber) || isLoading}
                    isLoading={isLoading}
                    className="w-full bg-white/80 border-gray-300 hover:bg-white/90 backdrop-blur-sm rounded-lg font-medium"
                    style={{ color: colors.gray[900] }}
                    size="lg"
                  >
                    Continue
                  </Button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setViewState('request-access');
                    }}
                    className="w-full text-sm text-gray-500 hover:underline"
                  >
                    Don't have a code? Request access
                  </button>
                </div>
              </form>
            </>
          )}
          
          {/* Request Access State */}
          {viewState === 'request-access' && (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-light mb-2" style={{ color: colors.gray[900] }}>
                  Request early access
                </h1>
                <p className="text-sm" style={{ color: colors.gray[700] }}>
                  We're letting people in gradually. Drop your info and we'll send a code soon.
                </p>
              </div>

              <form onSubmit={handleRequestAccess} className="space-y-6">
                {error && (
                  <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                    <p className="text-red-700 text-sm font-medium">{error}</p>
                  </div>
                )}
                
                <div>
                  <label htmlFor="firstName" className="sr-only">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    className="w-full px-4 py-3 bg-white/70 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent backdrop-blur-sm"
                    style={{ color: colors.gray[900] }}
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="lastName" className="sr-only">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    className="w-full px-4 py-3 bg-white/70 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent backdrop-blur-sm"
                    style={{ color: colors.gray[900] }}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="requestPhoneNumber" className="sr-only">
                    Phone Number
                  </label>
                  <PhoneInput
                    value={requestPhoneNumber}
                    onChange={setRequestPhoneNumber}
                    placeholder="Enter your phone number"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-3">
                  <Button
                    type="submit"
                    disabled={!firstName.trim() || !lastName.trim() || !requestPhoneNumber.trim() || !validatePhoneNumber(requestPhoneNumber) || isLoading}
                    isLoading={isLoading}
                    className="w-full bg-white/80 border-gray-300 hover:bg-white/90 backdrop-blur-sm rounded-lg font-medium"
                    style={{ color: colors.gray[900] }}
                    size="lg"
                  >
                    Request invite
                  </Button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setViewState('enter-code');
                    }}
                    className="w-full text-sm text-gray-500 hover:underline"
                  >
                    Already have a code? Enter it here
                  </button>
                </div>
              </form>
            </>
          )}
          
          {/* Confirmation State */}
          {viewState === 'confirmation' && (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-light mb-2" style={{ color: colors.gray[900] }}>
                  You're on the list 🎉
                </h1>
                <p className="text-sm" style={{ color: colors.gray[700] }}>
                  We'll text you when your invite is ready.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  type="button"
                  onClick={handleBack}
                  className="w-full bg-white/80 border-gray-300 hover:bg-white/90 backdrop-blur-sm rounded-lg font-medium"
                  style={{ color: colors.gray[900] }}
                  size="lg"
                >
                  Back to Home
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InviteCodePage;
