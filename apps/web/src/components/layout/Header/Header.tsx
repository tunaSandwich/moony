import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import logoText from '@/assets/icons/logo_text.png';

interface HeaderProps {
  /**
   * Optional className for additional styling
   */
  className?: string;
  
  /**
   * Whether to show navigation items (future feature)
   */
  showNav?: boolean;
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
 */
export const Header = forwardRef<HTMLElement, HeaderProps>(
  ({ className = '', showNav = false }, ref) => {
    return (
      <header
        ref={ref}
        className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-strong h-[60px] ${className}`}
        style={{
          background: 'var(--header-gradient)',
        }}
      >
        {/* Logo */}
        <Link to="/" className="absolute top-10 left-10 z-10" aria-label="Go to home">
          <img
            src={logoText}
            alt="moony Logo"
            className="w-23 h-auto"
          />
        </Link>

        {/* Future: Navigation items will go here when showNav is true */}
        {showNav && (
          <nav className="absolute top-1/2 right-10 -translate-y-1/2">
            {/* Navigation items TBD */}
          </nav>
        )}
      </header>
    );
  }
);

Header.displayName = 'Header';
