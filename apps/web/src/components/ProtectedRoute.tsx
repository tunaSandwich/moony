import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * ProtectedRoute wraps authenticated routes.
 *
 * - While the session is loading, renders a minimal full-screen spinner.
 * - If the user is not authenticated, redirects to /invite (login).
 * - If authenticated but not fully onboarded, redirects to the correct
 *   onboarding step (unless the user is already on that step).
 * - If fully onboarded, renders the child route via <Outlet />.
 */
const ProtectedRoute = () => {
  const { isLoading, isAuthenticated, onboarding } = useAuth();
  const location = useLocation();

  // Show loading spinner while session check is in-flight
  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-pink-bg"
      >
        <div className="text-center space-y-4">
          <div className="animate-pulse bg-white/20 h-2 w-48 rounded-full mx-auto" />
          <p className="text-sm text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated — send to login
  if (!isAuthenticated) {
    return <Navigate to="/invite" replace />;
  }

  // Determine the correct onboarding step the user should be on
  if (onboarding) {
    let requiredPath: string | null = null;

    if (!onboarding.hasConnectedBank) {
      requiredPath = '/connect-bank';
    } else if (!onboarding.phoneVerified) {
      requiredPath = '/phone-verification';
    } else if (!onboarding.hasSpendingGoal) {
      requiredPath = '/check-phone';
    }

    // If the user needs to be at a specific onboarding step and they're not
    // already there, redirect them.
    if (requiredPath && location.pathname !== requiredPath) {
      return <Navigate to={requiredPath} replace />;
    }

    // If fully onboarded but trying to access an onboarding page, send to dashboard
    if (
      !requiredPath &&
      ['/connect-bank', '/phone-verification', '/check-phone'].includes(location.pathname)
    ) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
