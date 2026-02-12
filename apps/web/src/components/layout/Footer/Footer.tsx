import { colors } from '@/design-system';

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterProps {
  /**
   * Optional description text to show above links
   */
  description?: string;

  /**
   * Navigation links to display
   */
  links?: FooterLink[];

  /**
   * Additional CSS classes
   */
  className?: string;
}

const DEFAULT_LINKS: FooterLink[] = [
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
];

const SUPPORT_EMAIL = 'gonzalezgarza.lucas@gmail.com';

/**
 * Reusable footer component for all pages.
 *
 * Renders navigation links, support email, and copyright notice.
 * Designed to sit inside an AppLayout so it appears on every page.
 */
export const Footer = ({
  description,
  links = DEFAULT_LINKS,
  className = '',
}: FooterProps) => {
  return (
    <footer className={`relative z-20 py-10 px-4 ${className}`}>
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

        {/* Horizontal Divider */}
        <div className="w-full h-px bg-gray-300 mb-8"></div>

        {/* Navigation Links — wraps gracefully on small screens */}
        {links.length > 0 && (
          <nav aria-label="Footer navigation">
            <div
              className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm mb-6"
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
                  {index < links.length - 1 && (
                    <span className="ml-5 hidden sm:inline" aria-hidden="true">|</span>
                  )}
                </div>
              ))}
            </div>
          </nav>
        )}

        {/* Support email */}
        <p className="text-xs mb-4" style={{ color: colors.gray[500] }}>
          Support:{' '}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="underline hover:text-gray-800 transition-colors"
          >
            {SUPPORT_EMAIL}
          </a>
        </p>

        {/* Copyright */}
        <p className="text-xs" style={{ color: colors.gray[500] }}>
          &copy; {new Date().getFullYear()} moony. All rights reserved.
        </p>
      </div>
    </footer>
  );
};
