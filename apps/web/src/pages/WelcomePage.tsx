import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { userApi, goalsApi } from '@/api';
import type { User } from '@/api/types';
import { TopBar } from '@/components/ui/TopBar';
import logoText from '@/assets/icons/logo_text.png';

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
    showFallback: true, // Always show manual goal setting on this page
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
                🎯 Your moony journey begins now!
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
            alt="moony Logo" 
            className="w-20 h-auto"
          />
        </div>
      </header>

      {/* Main Content with Padding for Header */}
      <div className="flex items-center justify-center px-6" style={{ paddingTop: '80px', minHeight: '100vh' }}>
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md shadow-xl border border-white/20">
          <TopBar radiusMode="inherit" />
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-3xl font-light mb-2" style={{ color: '#1E1E1E' }}>
              Welcome to <span className="font-semibold">moony</span>!
            </h1>
            <p className="text-sm" style={{ color: '#1E1E1E', opacity: 0.8 }}>
              Your spending analytics are ready.
            </p>
            {import.meta.env.DEV && (
              <div className="mt-2 px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-full inline-block">
                <p className="text-xs" style={{ color: '#1E1E1E' }}>
                  🧪 Test Mode: Messages via WhatsApp
                </p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {state.error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-700 text-sm">{state.error}</p>
              </div>
            )}

            {/* Analytics Display */}
            {state.user?.analytics && (
              <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                <h2 className="text-lg font-semibold mb-3" style={{ color: '#1E1E1E' }}>Your Spending Summary</h2>
                <div className="space-y-2 text-sm" style={{ color: '#1E1E1E' }}>
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

            {/* Manual Goal Setting - User came here via fallback */}
            <div className="space-y-4">
              <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                <h2 className="text-lg font-semibold mb-3" style={{ color: '#1E1E1E' }}>Set Your Goal</h2>
                <p className="text-sm mb-4" style={{ color: '#1E1E1E' }}>
                  Enter your monthly spending goal to complete setup:
                </p>
                
                <div className="space-y-3">
                  <div>
                    <label htmlFor="manualGoal" className="block text-sm font-medium mb-2" style={{ color: '#1E1E1E' }}>
                      Monthly Spending Goal
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-lg" style={{ color: '#1E1E1E', opacity: 0.6 }}>$</span>
                      <input
                        id="manualGoal"
                        type="number"
                        value={state.manualGoal}
                        onChange={(e) => updateState({ manualGoal: e.target.value, error: null })}
                        placeholder="3000"
                        min="100"
                        max="20000"
                        className="w-full pl-8 pr-4 py-3 bg-white/70 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent backdrop-blur-sm"
                        style={{ color: '#1E1E1E' }}
                        disabled={state.isSubmitting}
                      />
                    </div>
                    <p className="text-xs mt-1" style={{ color: '#1E1E1E', opacity: 0.8 }}>
                      Enter an amount between $100 and $20,000
                    </p>
                  </div>

                  <Button
                    onClick={handleManualGoalSubmit}
                    disabled={!state.manualGoal.trim() || state.isSubmitting}
                    isLoading={state.isSubmitting}
                    className="w-full bg-white/80 border-gray-300 hover:bg-white/90 backdrop-blur-sm rounded-lg font-medium"
                    style={{ color: '#1E1E1E' }}
                    size="lg"
                  >
                    {state.isSubmitting ? 'Setting Goal...' : 'Set Goal'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;
