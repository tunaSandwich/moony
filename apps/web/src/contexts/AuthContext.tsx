import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/api';
import { removeToken } from '@/api/client';
import type { User, OnboardingState } from '@/api/types';

interface AuthContextValue {
  user: User | null;
  onboarding: OnboardingState | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Call after successful invite-code validation to refresh session state */
  refreshSession: () => Promise<void>;
  /** Clear session cookie + local state, redirect to landing */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const refreshSession = useCallback(async () => {
    try {
      const session = await authApi.getSession();
      setUser(session.user);
      setOnboarding(session.onboarding);
      setIsAuthenticated(true);
    } catch {
      // 401 or network error — user is not authenticated
      setUser(null);
      setOnboarding(null);
      setIsAuthenticated(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Best-effort; cookie might already be gone
    }
    removeToken(); // Clear localStorage fallback
    setUser(null);
    setOnboarding(null);
    setIsAuthenticated(false);
    navigate('/');
  }, [navigate]);

  // Check session on mount
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await refreshSession();
      setIsLoading(false);
    };
    init();
  }, [refreshSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        onboarding,
        isLoading,
        isAuthenticated,
        refreshSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
