import { useState, useEffect } from 'react';
import { TopBar } from '@/components/ui/TopBar';
import { Header } from '@/components';
import { Button } from '@/components/ui/Button';
import { goalsApi } from '@/api';
import type { SpendingGoal } from '@/api/goals';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/design-system';

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const [goal, setGoal] = useState<SpendingGoal | null>(null);
  const [loadingGoal, setLoadingGoal] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const fetchGoal = async () => {
      try {
        const currentGoal = await goalsApi.getCurrentGoal();
        setGoal(currentGoal);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Failed to fetch spending goal:', error);
        }
      } finally {
        setLoadingGoal(false);
      }
    };

    fetchGoal();
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    // AuthContext clears state; ProtectedRoute will redirect to /invite
  };

  const formatCurrency = (amount: string | number | null | undefined): string => {
    if (amount === null || amount === undefined) return '$0';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const spentAmount = user?.analytics?.currentMonthSpending;
  const budgetGoal = goal?.monthlyLimit;

  // Calculate progress percentage for the bar
  const progressPercent =
    budgetGoal && spentAmount
      ? Math.min((parseFloat(String(spentAmount)) / budgetGoal) * 100, 100)
      : 0;

  const isOverBudget =
    budgetGoal && spentAmount ? parseFloat(String(spentAmount)) > budgetGoal : false;

  return (
    <div className="min-h-screen relative overflow-hidden bg-pink-bg">
      {/* Fixed Header with Logo */}
      <Header />

      {/* Main Content */}
      <div
        className="flex items-center justify-center px-6"
        style={{ paddingTop: '80px', minHeight: '100vh' }}
      >
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md shadow-xl border border-white/20">
          <TopBar radiusMode="inherit" />

          {/* Greeting */}
          <div className="text-center mb-8">
            <h1
              className="text-3xl font-light mb-1"
              style={{ color: colors.gray[900] }}
            >
              Hey, {user?.firstName || 'there'}
            </h1>
            <p className="text-sm" style={{ color: colors.gray[700] }}>
              Here's your spending snapshot
            </p>
          </div>

          {/* Loading state for goal */}
          {loadingGoal ? (
            <div className="space-y-4">
              <div className="animate-pulse bg-white/20 h-24 rounded-lg" />
              <div className="animate-pulse bg-white/20 h-16 rounded-lg" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Budget Goal Card */}
              <div className="bg-white/10 rounded-lg p-5 border border-white/20">
                <div className="flex justify-between items-baseline mb-4">
                  <span
                    className="text-sm font-medium"
                    style={{ color: colors.gray[700] }}
                  >
                    Monthly Budget
                  </span>
                  <span
                    className="text-2xl font-semibold"
                    style={{ color: colors.gray[900] }}
                  >
                    {budgetGoal ? formatCurrency(budgetGoal) : '—'}
                  </span>
                </div>

                {/* Spent amount */}
                <div className="flex justify-between items-baseline mb-3">
                  <span
                    className="text-sm font-medium"
                    style={{ color: colors.gray[700] }}
                  >
                    Spent so far
                  </span>
                  <span
                    className="text-2xl font-semibold"
                    style={{
                      color: isOverBudget ? '#ef4444' : colors.gray[900],
                    }}
                  >
                    {spentAmount ? formatCurrency(spentAmount) : '$0'}
                  </span>
                </div>

                {/* Progress bar */}
                {budgetGoal ? (
                  <div className="w-full bg-white/20 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${progressPercent}%`,
                        background: isOverBudget
                          ? '#ef4444'
                          : 'linear-gradient(90deg, #f472b6, #f9a8d4)',
                      }}
                    />
                  </div>
                ) : null}

                {budgetGoal && spentAmount ? (
                  <p
                    className="text-xs mt-2 text-right"
                    style={{ color: colors.gray[700] }}
                  >
                    {formatCurrency(
                      Math.max(budgetGoal - parseFloat(String(spentAmount)), 0)
                    )}{' '}
                    remaining
                  </p>
                ) : null}
              </div>

              {/* Period Dates Card */}
              <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                <h2
                  className="text-sm font-medium mb-3"
                  style={{ color: colors.gray[700] }}
                >
                  Current Period
                </h2>
                <div className="flex justify-between text-sm" style={{ color: colors.gray[900] }}>
                  <div>
                    <span className="block text-xs" style={{ color: colors.gray[700] }}>
                      Start
                    </span>
                    <span className="font-medium">
                      {formatDate(goal?.periodStart)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-xs" style={{ color: colors.gray[700] }}>
                      End
                    </span>
                    <span className="font-medium">
                      {formatDate(goal?.periodEnd)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Logout Button */}
              <Button
                onClick={handleLogout}
                disabled={isLoggingOut}
                isLoading={isLoggingOut}
                className="w-full bg-white/80 border-gray-300 hover:bg-white/90 backdrop-blur-sm rounded-lg font-medium"
                style={{ color: colors.gray[900] }}
                size="lg"
              >
                {isLoggingOut ? 'Logging out...' : 'Log Out'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
