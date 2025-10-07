import { colors } from '@/design-system';

// Bank logo type definition
export interface BankLogo {
  src: string;
  alt: string;
}

export interface BankLogosProps {
  /**
   * Array of bank logos to display
   */
  logos: BankLogo[];
  
  /**
   * Heading text
   */
  heading?: string;
  
  /**
   * Subtext below heading
   */
  subtext?: string;
  
  /**
   * Show top divider
   */
  showTopDivider?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * BankLogos Section Component
 * 
 * Displays a grid of bank logos with heading and subtext.
 * Used to show bank compatibility/integration.
 * 
 * Features:
 * - Responsive grid (2 cols mobile, 4 cols desktop)
 * - Grayscale filter with hover effect
 * - Configurable logos, heading, and subtext
 * - Optional top divider
 */
export const BankLogos = ({
  logos,
  heading = 'Works with your bank',
  subtext = 'Powered by Plaid • 11,000+ banks supported',
  showTopDivider = true,
  className = '',
}: BankLogosProps) => {
  return (
    <div className={`mb-0 ${className}`}>
      {/* Horizontal Divider */}
      {showTopDivider && <div className="w-full h-px bg-gray-300 mb-12"></div>}
      
      {/* Section Heading */}
      <h2 
        className="text-xl sm:text-2xl font-bold mb-2 text-center"
        style={{ color: colors.gray[900] }}
      >
        {heading}
      </h2>
      
      {/* Subtext */}
      <p 
        className="text-sm mb-10 text-center"
        style={{ color: colors.gray[500] }}
      >
        {subtext}
      </p>
      
      {/* Bank Logos Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-12 max-w-4xl mx-auto mb-5">
        {logos.map((bank, index) => (
          <div 
            key={index}
            className="flex items-center justify-center p-4"
          >
            <img
              src={bank.src}
              alt={bank.alt}
              className="h-9 w-auto object-contain opacity-70 hover:opacity-90 transition-opacity duration-200"
              loading="lazy"
              style={{ filter: 'grayscale(100%)' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
