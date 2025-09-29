import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { userApi, goalsApi } from '@/api';
import type { User } from '@/api/types';

interface WelcomeState {
  user: User | null;
  loadingUser: boolean;
  showFallback: boolean;
  manualGoal: string;
  isSubmitting: boolean;
  error: string | null;
  goalSet: boolean;
}

const WelcomePage = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<WelcomeState>({
    user: null,
    loadingUser: true,
    showFallback: false,
    manualGoal: '',
    isSubmitting: false,
    error: null,
    goalSet: false
  });

  const updateState = (updates: Partial<WelcomeState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  // Fetch user data on mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = await userApi.getCurrentUser();
        updateState({ 
          user, 
          loadingUser: false 
        });

        // If user is not verified, redirect to verification
        if (user.twilioStatus !== 'verified') {
          navigate('/phone-verification');
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

  // Show fallback after 30 seconds
  useEffect(() => {
    if (state.user && !state.goalSet) {
      const timer = setTimeout(() => {
        updateState({ showFallback: true });
      }, 30000); // 30 seconds

      return () => clearTimeout(timer);
    }
  }, [state.user, state.goalSet]);

  const validateGoal = (goal: string): boolean => {
    const amount = parseFloat(goal);
    return !isNaN(amount) && amount >= 100 && amount <= 20000;
  };

  const formatCurrency = (amount: string | null | undefined): string => {
    if (!amount) return '$0';
    const num = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const handleManualGoalSubmit = async () => {
    if (!validateGoal(state.manualGoal)) {
      updateState({ error: 'Please enter a goal between $100 and $20,000' });
      return;
    }

    updateState({ isSubmitting: true, error: null });

    try {
      await goalsApi.setSpendingGoal(parseFloat(state.manualGoal));
      
      updateState({ 
        goalSet: true, 
        isSubmitting: false 
      });
    } catch (error) {
      updateState({ 
        error: error instanceof Error ? error.message : 'Failed to set goal. Please try again.', 
        isSubmitting: false 
      });
    }
  };

  // Loading state
  if (state.loadingUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-pink-200 flex items-center justify-center px-6">
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

  // Goal set success state
  if (state.goalSet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-pink-200 flex items-center justify-center px-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md shadow-xl border border-white/20">
          <div className="text-center space-y-6">
            <div className="text-6xl">✅</div>
            <h1 className="text-3xl font-light text-white">
              Goal Set Successfully!
            </h1>
            <p className="text-white/90 text-sm">
              Your monthly spending goal of {formatCurrency(state.manualGoal)} has been saved. 
              You'll receive daily updates on your progress.
            </p>
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
              <p className="text-green-200 text-sm">
                🎯 Your Moony journey begins now!
              </p>
            </div>
            <Button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-white/20 text-white border-white/30 hover:bg-white/30 backdrop-blur-sm rounded-lg font-medium"
              size="lg"
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Main welcome content
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-pink-200 flex items-center justify-center px-6">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md shadow-xl border border-white/20">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-light text-white mb-2">
            Welcome to <span className="font-semibold">Moony</span>!
          </h1>
          <p className="text-white/80 text-sm">
            Your spending analytics are ready.
          </p>
          {import.meta.env.DEV && (
            <div className="mt-2 px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-full inline-block">
              <p className="text-yellow-200 text-xs">
                🧪 Test Mode: Messages via WhatsApp
              </p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {state.error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-200 text-sm">{state.error}</p>
            </div>
          )}

          {/* Analytics Display */}
          {state.user?.analytics && (
            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <h2 className="text-lg font-semibold text-white mb-3">Your Spending Summary</h2>
              <div className="space-y-2 text-white/90 text-sm">
                <div className="flex justify-between">
                  <span>📊 Average monthly:</span>
                  <span className="font-medium">{formatCurrency(state.user.analytics.averageMonthlySpending)}</span>
                </div>
                <div className="flex justify-between">
                  <span>📅 Last month:</span>
                  <span className="font-medium">{formatCurrency(state.user.analytics.lastMonthSpending)}</span>
                </div>
                <div className="flex justify-between">
                  <span>💰 This month so far:</span>
                  <span className="font-medium">{formatCurrency(state.user.analytics.currentMonthSpending)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Messaging Instructions */}
          {!state.showFallback ? (
            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <h2 className="text-lg font-semibold text-white mb-3">📱 Check Your Phone</h2>
              <div className="space-y-2 text-white/90 text-sm">
                <p>We've sent a message to your phone with:</p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>Your spending summary</li>
                  <li>Instructions to set your goal</li>
                </ul>
                <p className="mt-3 font-medium">
                  Simply reply to that message (SMS or WhatsApp) with your monthly spending goal (example: 3000).
                </p>
                <div className="mt-3 p-2 bg-white/5 rounded border border-white/10">
                  <p className="text-white/70 text-xs">
                    💡 The message may arrive via SMS or WhatsApp depending on availability. Check both!
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Fallback Content */
            <div className="space-y-4">
              <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                <h2 className="text-lg font-semibold text-white mb-3">Haven't received the message yet?</h2>
                <p className="text-white/90 text-sm mb-4">
                  📋 Set your goal here instead:
                </p>
                
                <div className="space-y-3">
                  <div>
                    <label htmlFor="manualGoal" className="block text-white/90 text-sm font-medium mb-2">
                      Monthly Spending Goal
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 text-lg">$</span>
                      <input
                        id="manualGoal"
                        type="number"
                        value={state.manualGoal}
                        onChange={(e) => updateState({ manualGoal: e.target.value, error: null })}
                        placeholder="3000"
                        min="100"
                        max="20000"
                        className="w-full pl-8 pr-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent backdrop-blur-sm"
                        disabled={state.isSubmitting}
                      />
                    </div>
                    <p className="text-white/60 text-xs mt-1">
                      Enter an amount between $100 and $20,000
                    </p>
                  </div>

                  <Button
                    onClick={handleManualGoalSubmit}
                    disabled={!state.manualGoal.trim() || state.isSubmitting}
                    isLoading={state.isSubmitting}
                    className="w-full bg-white/20 text-white border-white/30 hover:bg-white/30 backdrop-blur-sm rounded-lg font-medium"
                    size="lg"
                  >
                    {state.isSubmitting ? 'Setting Goal...' : 'Set Goal'}
                  </Button>
                </div>
              </div>

              {/* Troubleshooting Tips */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h3 className="text-white/90 text-sm font-medium mb-2">💡 Message Troubleshooting Tips:</h3>
                <ul className="text-white/70 text-xs space-y-1">
                  <li>• Check both SMS and WhatsApp messages</li>
                  <li>• Look in spam/blocked message folders</li>
                  <li>• Make sure you have cell or internet service</li>
                  <li>• The message may take a few minutes to arrive</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;
