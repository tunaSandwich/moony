import logo from '@/assets/icons/logo.png';
import { colors } from '@/design-system';

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterProps {
  /**
   * Optional description text to show above logo
   */
  description?: string;
  
  /**
   * Privacy/legal links to display
   */
  links?: FooterLink[];
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Show or hide the logo
   */
  showLogo?: boolean;
}

const DEFAULT_LINKS: FooterLink[] = [
  { label: 'PRIVACY POLICY', href: '#' },
  { label: 'TERMS OF SERVICE', href: '#' },
  { label: 'LICENSE AGREEMENT', href: '#' },
];

/**
 * Reusable footer component for all pages.
 * 
 * Features:
 * - Optional description text
 * - Logo display
 * - Configurable privacy links
 * - Horizontal dividers
 * - Responsive layout
 */
export const Footer = ({
  description,
  links = DEFAULT_LINKS,
  className = '',
  showLogo = true,
}: FooterProps) => {
  return (
    <footer className={`relative z-20 py-16 px-4 ${className}`}>
      <div className="max-w-4xl mx-auto text-center">
        {/* Description */}
        {description && (
          <p 
            className="text-sm sm:text-lg mb-10 leading-relaxed font-bold"
            style={{ color: colors.gray[700] }}
          >
            {description}
          </p>
        )}

        {/* Logo */}
        {showLogo && (
          <div className="mb-8">
            <img
              src={logo}
              alt="moony Logo"
              className="w-16 h-16 mx-auto"
            />
          </div>
        )}

        {/* Horizontal Divider */}
        <div className="w-full h-px bg-gray-300 mb-12"></div>

        {/* Privacy Links */}
        {links.length > 0 && (
          <div 
            className="flex justify-center items-center space-x-4 text-sm mb-16"
            style={{ color: colors.gray[500] }}
          >
            {links.map((link, index) => (
              <div key={link.label} className="flex items-center">
                <a
                  href={link.href}
                  className="hover:text-gray-800 transition-colors"
                >
                  {link.label}
                </a>
                {index < links.length - 1 && <span className="ml-4">|</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </footer>
  );
};