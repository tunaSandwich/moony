import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { twilioApi } from '@/api';

interface VerificationState {
  smsConsentGiven: boolean;
  phoneNumber: string;
  verificationCodeSent: boolean;
  verificationCode: string;
  isLoading: boolean;
  error: string | null;
  isVerified: boolean;
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
    isVerified: false
  });

  const updateState = (updates: Partial<VerificationState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const validatePhoneNumber = (phone: string): boolean => {
    // US phone number validation (allows various formats)
    const phoneRegex = /^[\+]?[1]?[\s\-\(\)]?[0-9]{3}[\s\-\(\)]?[0-9]{3}[\s\-]?[0-9]{4}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
  };

  const formatPhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    }
    return phone;
  };

  const handleSendCode = async () => {
    if (!validatePhoneNumber(state.phoneNumber)) {
      updateState({ error: 'Please enter a valid US phone number' });
      return;
    }

    updateState({ isLoading: true, error: null });

    try {
      const formattedPhone = formatPhoneNumber(state.phoneNumber);
      await twilioApi.sendVerificationCode(formattedPhone);
      updateState({ 
        verificationCodeSent: true, 
        isLoading: false,
        phoneNumber: formattedPhone
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
      
      // Navigate to success/dashboard after successful verification
      setTimeout(() => {
        navigate('/welcome');
      }, 2000);
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

  if (state.isVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-pink-200 flex items-center justify-center px-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md shadow-xl border border-white/20">
          <div className="text-center space-y-6">
            <div className="text-6xl">🎉</div>
            <h1 className="text-3xl font-light text-white">
              Welcome to Budget Pal!
            </h1>
            <p className="text-white/90 text-sm">
              Your phone number has been verified successfully. You'll receive a welcome message with your spending analytics shortly.
            </p>
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
              <p className="text-green-200 text-sm">
                ✅ SMS notifications are now active
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-pink-200 flex items-center justify-center px-6">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md shadow-xl border border-white/20">
        {/* Header with Progress */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-3 h-3 bg-white rounded-full"></div>
            <div className="w-8 h-1 bg-white rounded"></div>
            <div className="w-3 h-3 bg-white rounded-full"></div>
            <div className="w-8 h-1 bg-white rounded"></div>
            <div className="w-3 h-3 bg-white/50 rounded-full border-2 border-white"></div>
          </div>
          <h1 className="text-3xl font-light text-white mb-2">
            <span className="font-semibold">Budget Pal</span> SMS Setup
          </h1>
          <p className="text-white/80 text-sm">
            Step 3 of 3: Enable daily spending notifications
          </p>
        </div>

        <div className="space-y-6">
          {state.error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-200 text-sm">{state.error}</p>
            </div>
          )}

          {/* SMS Consent Section */}
          <div className="bg-white/10 rounded-lg p-4 border border-white/20">
            <h2 className="text-lg font-semibold text-white mb-3">SMS Services Agreement</h2>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="smsConsent"
                  checked={state.smsConsentGiven}
                  onChange={(e) => updateState({ smsConsentGiven: e.target.checked, error: null })}
                  className="w-4 h-4 mt-1 rounded border-white/30 bg-white/20 text-blue-600 focus:ring-2 focus:ring-white/50"
                />
                <label htmlFor="smsConsent" className="text-white/90 text-sm leading-relaxed">
                  <strong>By checking this box, I consent to receive daily spending notifications and monthly budget messages via SMS from Budget Pal.</strong>
                  <br /><br />
                  <strong>Message frequency:</strong> 1-2 messages per day
                  <br />
                  <strong>Message and data rates may apply.</strong>
                  <br />
                  Reply <strong>STOP</strong> to opt out at any time. For help, reply <strong>HELP</strong>.
                </label>
              </div>
            </div>
          </div>

          {/* Phone Number Input */}
          {state.smsConsentGiven && (
            <div>
              <label htmlFor="phoneNumber" className="block text-white/90 text-sm font-medium mb-2">
                Phone Number
              </label>
              <input
                id="phoneNumber"
                type="tel"
                value={state.phoneNumber}
                onChange={(e) => updateState({ phoneNumber: e.target.value, error: null })}
                placeholder="Enter your phone number (e.g., +15551234567)"
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent backdrop-blur-sm"
                disabled={state.verificationCodeSent || state.isLoading}
              />
            </div>
          )}

          {/* Verification Code Input */}
          {state.verificationCodeSent && (
            <div>
              <label htmlFor="verificationCode" className="block text-white/90 text-sm font-medium mb-2">
                Verification Code
              </label>
              <input
                id="verificationCode"
                type="text"
                value={state.verificationCode}
                onChange={(e) => updateState({ verificationCode: e.target.value.replace(/\D/g, ''), error: null })}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent backdrop-blur-sm text-center text-lg tracking-widest"
              />
              <p className="text-white/70 text-xs mt-2">
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
                className="w-full bg-white/20 text-white border-white/30 hover:bg-white/30 backdrop-blur-sm rounded-lg font-medium"
                size="lg"
              >
                {state.isLoading ? 'Sending Code...' : 'Send Verification Code'}
              </Button>
            ) : (
              <Button
                onClick={handleVerifyCode}
                disabled={state.verificationCode.length !== 6 || state.isLoading}
                isLoading={state.isLoading}
                className="w-full bg-white/20 text-white border-white/30 hover:bg-white/30 backdrop-blur-sm rounded-lg font-medium"
                size="lg"
              >
                {state.isLoading ? 'Verifying...' : 'Verify Phone Number'}
              </Button>
            )}

          </div>

          {/* Legal Links */}
          <div className="pt-4 border-t border-white/20">
            <p className="text-white/70 text-xs text-center leading-relaxed">
              By using Budget Pal SMS services, you agree to our{' '}
              <button 
                onClick={handleTermsClick}
                className="underline hover:text-white transition-colors"
              >
                Terms of Service
              </button>{' '}
              and{' '}
              <button 
                onClick={handlePrivacyClick}
                className="underline hover:text-white transition-colors"
              >
                Privacy Policy
              </button>
              .<br />
              <strong>Mobile information will not be shared with third parties for marketing purposes.</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhoneVerificationPage;
