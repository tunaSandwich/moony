import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { TopBar } from '@/components/ui/TopBar';
import { twilioApi, userApi } from '@/api';
import type { User } from '@/api/types';
import { Header } from '@/components';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { parseE164, validatePhoneForCountry } from '@/utils/phoneFormatters';
import { countries } from '@/components/forms/PhoneInput/countryData';

interface VerificationState {
  smsConsentGiven: boolean;
  phoneNumber: string;
  verificationCodeSent: boolean;
  verificationCode: string;
  isLoading: boolean;
  error: string | null;
  isVerified: boolean;
  user: User | null;
  loadingUser: boolean;
}

const PhoneVerificationPage = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<VerificationState>({
    smsConsentGiven: false,
    phoneNumber: '',
    verificationCodeSent: false,
    verificationCode: '',
    isLoading: false,
    error: null,
    isVerified: false,
    user: null,
    loadingUser: true
  });

  const updateState = (updates: Partial<VerificationState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  // Fetch user data on mount and redirect if already verified
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = await userApi.getCurrentUser();
        updateState({ 
          user, 
          phoneNumber: user.phoneNumber || '',
          loadingUser: false 
        });

        // Redirect if already verified
        if (user.twilioStatus === 'verified') {
          await new Promise(resolve => setTimeout(resolve, 2000));
          navigate('/welcome');
          return;
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
        // If user fetch fails (e.g., not logged in), redirect to login
        navigate('/');
      }
    };

    fetchUserData();
  }, [navigate]);


  const handleSendCode = async () => {
    if (!state.phoneNumber || state.phoneNumber.length < 8) {
      updateState({ error: 'Please enter a valid phone number' });
      return;
    }

    // Validate using new phone utilities
    const { dialCode, number } = parseE164(state.phoneNumber);
    const country = countries.find(c => c.dialCode === dialCode);
    
    if (!country || !validatePhoneForCountry(number, country)) {
      updateState({ error: 'Please enter a valid phone number for the selected country' });
      return;
    }

    updateState({ isLoading: true, error: null });

    try {
      await twilioApi.sendVerificationCode(state.phoneNumber); // Already in E.164 format from PhoneInput
      updateState({ 
        verificationCodeSent: true, 
        isLoading: false
      });
    } catch (error) {
      updateState({ 
        error: error instanceof Error ? error.message : 'Failed to send verification code', 
        isLoading: false 
      });
    }
  };

  const handleVerifyCode = async () => {
    if (state.verificationCode.length !== 6) {
      updateState({ error: 'Please enter the 6-digit verification code' });
      return;
    }

    updateState({ isLoading: true, error: null });

    try {
      await twilioApi.verifyPhoneNumber(state.verificationCode);
      updateState({ isVerified: true, isLoading: false });
      
      // Navigate to bridge screen after successful verification
      setTimeout(() => {
        navigate('/check-phone');
      }, 4000); // Extended to 4 seconds so user can read the success message
    } catch (error) {
      updateState({ 
        error: error instanceof Error ? error.message : 'Invalid verification code', 
        isLoading: false 
      });
    }
  };

  const handleTermsClick = () => {
    window.open('/terms', '_blank');
  };

  const handlePrivacyClick = () => {
    window.open('/privacy', '_blank');
  };

  // Show loading while fetching user data
  if (state.loadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md shadow-xl border border-white/20">
          <div className="text-center space-y-6">
            <div className="text-4xl">📱</div>
            <h1 className="text-2xl font-light text-white">
              Loading your profile...
            </h1>
            <div className="animate-pulse bg-white/20 h-2 rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (state.isVerified) {
    return (
      <div className="min-h-screen relative overflow-hidden" style={{backgroundColor: '#FFF8FC'}}>
        <Header />
        
        <div className="flex items-center justify-center px-6" style={{ paddingTop: '80px', minHeight: '100vh' }}>
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md shadow-xl border border-white/20">
            <TopBar radiusMode="inherit" />
            
            <div className="text-center space-y-6">
              <div className="text-6xl">📱</div>
              <h1 className="text-2xl font-light" style={{ color: '#1E1E1E' }}>
                Phone Verified!
              </h1>
              <p className="text-sm" style={{ color: '#1E1E1E', opacity: 0.8 }}>
                Setting up your spending tracker...
              </p>
              
              <div className="flex justify-center">
                <svg className="animate-spin h-6 w-6" style={{ color: '#1E1E1E' }} viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{backgroundColor: '#FFF8FC'}}>
      {/* Fixed Header with Logo - Consistent with Landing Page */}

      <Header />

      {/* Main Content with Padding for Header */}
      <div className="flex items-center justify-center px-6" style={{ paddingTop: '80px', minHeight: '100vh' }}>
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md shadow-xl border border-white/20">
        <TopBar radiusMode="inherit" />
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-light mb-2" style={{ color: '#1E1E1E' }}>
            <span className="font-semibold">moony</span> SMS Setup
          </h1>
          <p className="text-sm" style={{ color: '#1E1E1E', opacity: 0.8 }}>
            Enable daily spending notifications
          </p>
        </div>

        <div className="space-y-6">
          {state.error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-700 text-sm">{state.error}</p>
            </div>
          )}

          {/* SMS Consent Section */}
          <div className="bg-white/10 rounded-lg p-4 border border-white/20">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="smsConsent"
                  checked={state.smsConsentGiven}
                  onChange={(e) => updateState({ smsConsentGiven: e.target.checked, error: null })}
                  className="w-4 h-4 mt-1 rounded border-gray-300 bg-white/70 text-blue-600 focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                />
                <label htmlFor="smsConsent" className="text-sm leading-relaxed" style={{ color: '#1E1E1E' }}>
                  <strong>I consent to receive daily spending notifications via SMS from moony.</strong>
                  <br />
                  Message frequency: 1-2 messages per day. Your carrier's standard messaging rates apply.
                  <br />
                  Mobile information will not be shared with third parties for marketing purposes.
                  <br />
                  Reply <strong>STOP</strong> to opt out. Reply <strong>HELP</strong> for help.
                </label>
              </div>
            </div>
          </div>

          {/* Phone Number Input */}
          {state.smsConsentGiven && (
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium mb-2" style={{ color: '#1E1E1E' }}>
                Phone Number
              </label>
              <PhoneInput
                value={state.phoneNumber}
                onChange={(value) => updateState({ phoneNumber: value, error: null })}
                error={state.error && state.error.includes('phone') ? state.error : undefined}
                disabled={state.verificationCodeSent || state.isLoading}
                placeholder="Enter your phone number"
              />
            </div>
          )}

          {/* Verification Code Input */}
          {state.verificationCodeSent && (
            <div>
            <label htmlFor="verificationCode" className="block text-sm font-medium mb-2" style={{ color: '#1E1E1E' }}>
                Verification Code
              </label>
              <input
                id="verificationCode"
                type="text"
                value={state.verificationCode}
                onChange={(e) => updateState({ verificationCode: e.target.value.replace(/\D/g, ''), error: null })}
                placeholder="Enter 6-digit code"
                maxLength={6}
              className="w-full px-4 py-3 bg-white/70 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent backdrop-blur-sm text-center text-lg tracking-widest"
              style={{ color: '#1E1E1E' }}
              />
            <p className="text-xs mt-2" style={{ color: '#1E1E1E', opacity: 0.8 }}>
                We sent a verification code to {state.phoneNumber}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {!state.verificationCodeSent ? (
              <Button
                onClick={handleSendCode}
                disabled={!state.smsConsentGiven || !state.phoneNumber.trim() || state.isLoading}
                isLoading={state.isLoading}
                className="w-full bg-white/80 border-gray-300 hover:bg-white/90 backdrop-blur-sm rounded-lg font-medium"
                style={{ color: '#1E1E1E' }}
                size="lg"
              >
                {state.isLoading ? 'Sending Code...' : 'Send Verification Code'}
              </Button>
            ) : (
              <Button
                onClick={handleVerifyCode}
                disabled={state.verificationCode.length !== 6 || state.isLoading}
                isLoading={state.isLoading}
                className="w-full bg-white/80 border-gray-300 hover:bg-white/90 backdrop-blur-sm rounded-lg font-medium"
                style={{ color: '#1E1E1E' }}
                size="lg"
              >
                {state.isLoading ? 'Verifying...' : 'Verify Phone Number'}
              </Button>
            )}

          </div>

          {/* Legal Links */}
          <div className="pt-4 border-t border-white/20">
            <p className="text-xs text-center leading-relaxed" style={{ color: '#1E1E1E', opacity: 0.8 }}>
              By continuing, you agree to our{' '}
              <button 
                onClick={handleTermsClick}
                className="underline hover:text-black transition-colors"
              >
                Terms
              </button>{' '}
              and{' '}
              <button 
                onClick={handlePrivacyClick}
                className="underline hover:text-black transition-colors"
              >
                Privacy Policy
              </button>.
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default PhoneVerificationPage;
