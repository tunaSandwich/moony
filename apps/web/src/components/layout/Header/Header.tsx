import { forwardRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import logoText from '@/assets/icons/logo_text.png';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  /**
   * Optional className for additional styling
   */
  className?: string;

  /**
   * Whether to show the landing-page auth links (login / profile) on the right.
   * Only the landing page should set this to true.
   */
  showAuthAction?: boolean;

  /**
   * Optional custom content rendered in the top-right area.
   * Takes precedence over showAuthAction when provided.
   */
  rightSlot?: ReactNode;
}

/**
 * Reusable header component with logo and gradient background.
 * Used across all main pages for consistent branding.
 *
 * Features:
 * - Fixed positioning with backdrop blur
 * - Gradient fade effect
 * - Responsive logo sizing
 * - Ref forwarding for scroll animations
 * - Optional right slot for page-specific actions
 */
export const Header = forwardRef<HTMLElement, HeaderProps>(
  ({ className = '', showAuthAction = false, rightSlot }, ref) => {
    const { isAuthenticated, isLoading } = useAuth();

    return (
      <header
        ref={ref}
        className={`fixed top-0 left-0 right-0 z-50 backdrop-blur h-[60px] ${className}`}
        style={{
          background: 'var(--header-gradient)',
        }}
      >
        {/* Logo — top-left */}
        <Link to="/" className="absolute top-5 left-10 z-10" aria-label="Go to home">
          <img
            src={logoText}
            alt="moony Logo"
            className="w-23 h-auto"
          />
        </Link>

        {/* Right area — custom slot takes precedence, then auth action */}
        {rightSlot ? (
          <div className="absolute top-4 right-10 z-10">{rightSlot}</div>
        ) : showAuthAction && !isLoading ? (
          <div className="absolute top-4 right-10 z-10">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                aria-label="Go to dashboard"
                className="flex items-center justify-center w-8 h-8 rounded-full bg-[#1E1E1E]/8 hover:bg-[#1E1E1E]/15 transition-colors duration-200"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#1E1E1E"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-[18px] h-[18px]"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M20 21a8 8 0 1 0-16 0" />
                </svg>
              </Link>
            ) : (
              <Link
                to="/invite"
                className="text-sm font-medium transition-opacity duration-200 hover:opacity-70"
                style={{ color: '#1E1E1E' }}
              >
                Log in / Sign up
              </Link>
            )}
          </div>
        ) : null}
      </header>
    );
  }
);

Header.displayName = 'Header';
