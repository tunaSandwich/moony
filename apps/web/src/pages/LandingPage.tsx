import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/Button/Button';
import { Header, Footer, BankLogos, PhoneVideo } from '@/components';
import type { BankLogo } from '@/components';
import phoneVideo from '@/assets/images/hand_and_phone_crop.mp4';
import { colors, animationDurations, easingStrings } from '@/design-system';
import { useReducedMotion, useSmoothScroll, useScrollFade } from '@/hooks';

// Bank logos
import chaseLogo from '@/assets/images/banks/chase.svg';
import boaLogo from '@/assets/images/banks/bank-of-america.svg';
import wellsFargoLogo from '@/assets/images/banks/wells-fargo.svg';
import capitalOneLogo from '@/assets/images/banks/capital-one.svg';
import citiLogo from '@/assets/images/banks/citi.svg';
import amexLogo from '@/assets/images/banks/american-express.svg';
import usBankLogo from '@/assets/images/banks/us-bank.svg';
import schwabLogo from '@/assets/images/banks/schwab.svg';

// Bank logos data structure
const BANK_LOGOS: BankLogo[] = [
  { src: chaseLogo, alt: 'Chase Bank' },
  { src: boaLogo, alt: 'Bank of America' },
  { src: wellsFargoLogo, alt: 'Wells Fargo' },
  { src: capitalOneLogo, alt: 'Capital One' },
  { src: citiLogo, alt: 'Citibank' },
  { src: amexLogo, alt: 'American Express' },
  { src: usBankLogo, alt: 'US Bank' },
  { src: schwabLogo, alt: 'Charles Schwab' },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  
  // Page load animation state
  const [animationsComplete, setAnimationsComplete] = useState(false);
  
  
  const headerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  // Initialize hooks
  useSmoothScroll({ disabled: prefersReducedMotion });
  useScrollFade(
    { titleRef, subtitleRef, buttonRef },
    { disabled: prefersReducedMotion, animationsComplete }
  );
  
  const handleGetStarted = () => {
    navigate('/invite');
  };



  // Set initial styles immediately on mount
  useEffect(() => {
    if (!titleRef.current || !subtitleRef.current || !buttonRef.current) return;

    // Set initial styles immediately to prevent flash
    const elements = [titleRef.current, subtitleRef.current, buttonRef.current];
    elements.forEach(el => {
      el.style.opacity = '0.1';
      el.style.transform = 'translateY(20px) scale(0.95)';
    });
  }, []);


  // Page load animations
  useEffect(() => {
    const executeAnimation = () => {
      if (!titleRef.current || !subtitleRef.current || !buttonRef.current) return;

      const duration = prefersReducedMotion ? 100 : 1500;
      
      // Set transition properties
      const elements = [titleRef.current, subtitleRef.current, buttonRef.current];
      elements.forEach(el => {
        el.style.transition = prefersReducedMotion ? 'none' : `all 0.6s ${easingStrings.default}`;
      });

      if (prefersReducedMotion) {
        // Instant appearance for reduced motion
        elements.forEach(el => {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0px) scale(1)';
        });
        setAnimationsComplete(true);
        return;
      }

      // Phase 1: Text elements appear (0.6s, simultaneous)
      setTimeout(() => {
        elements.forEach(el => {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0px) scale(1)';
        });
      }, 100);

      // Mark animations complete
      setTimeout(() => {
        setAnimationsComplete(true);
      }, duration);
    };

    const timer = setTimeout(executeAnimation, 100); // Small delay for initial styles to apply
    return () => clearTimeout(timer);
  }, [prefersReducedMotion]);


  return (
    <div className="min-h-screen relative overflow-hidden bg-pink-bg">
      {/* Fixed Header with Logo and Strong Blur - Exactly 120px */}
      <Header ref={headerRef} />

      {/* Fixed Text Section - Exactly 280px from top */}
      <div 
        className="fixed left-1/2 z-10 pointer-events-none"
        style={{
          top: '280px', // Exactly 160px below 120px header
          transform: 'translateX(-50%)'
        }}
      >
        <div className="text-center max-w-6xl px-4 sm:px-6">
          {/* Main Heading - Exactly 20px margin to subtitle */}
          <div className="pointer-events-auto">
          <h1 
            ref={titleRef}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gradient leading-tight whitespace-nowrap"
            style={{ marginBottom: '20px' }}
          >
            Fix your spending habits.
          </h1>
          </div>
          
          {/* Subtitle - Exactly 40px margin to button */}
          <div className="pointer-events-auto">
            <p 
              ref={subtitleRef}
              className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-gradient font-light leading-relaxed whitespace-nowrap"
              style={{ marginBottom: '40px' }}
            >
              Simple daily texts keeps you on budget.
            </p>
          </div>
        </div>
      </div>

      {/* Scrolling Content - Button and Phone with exact positioning */}
      <div className="relative z-20 px-4 sm:px-6" style={{ paddingTop: '120px' }}>
        {/* Invisible spacer to match fixed text positioning */}
        <div style={{ height: '160px' }}></div>
        
        {/* Invisible text elements to maintain layout spacing */}
        <div className="text-center max-w-6xl mx-auto">
          <h1 
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight opacity-0 pointer-events-none whitespace-nowrap"
            style={{ marginBottom: '20px' }}
          >
            Fix your spending habits.
          </h1>
          <p 
            className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-light leading-relaxed opacity-0 pointer-events-none whitespace-nowrap"
            style={{ marginBottom: '40px' }}
          >
            Simple daily texts keeps you on budget.
          </p>
          
          {/* CTA Button - Exactly 40px below subtitle */}
          <div className="flex justify-center" style={{ marginBottom: '40px' }}>
            <Button
              ref={buttonRef}
              onClick={handleGetStarted}
              variant="primary"
              size="xl"
              className="bg-transparent text-black border border-black px-8 py-4 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 min-h-[56px] touch-manipulation"
            >
              Try it free
            </Button>
          </div>

          {/* iPhone Mockup - Exactly 40px below button */}
          <PhoneVideo
            videoSrc={phoneVideo}
            ariaLabel="Budget tracking on mobile"
            maxWidth="1200px"
            playOnScroll={true}
          />
        </div>
      </div>

      {/* Bottom Section */}
      <div className="relative z-20 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Description */}
          <p className="text-sm sm:text-lg mb-10 leading-relaxed font-bold" style={{ color: colors.gray[700] }}>
            Connect your bank and phone. 
            Set your goal. 
            Stay on budget with daily text updates.
          </p>

          {/* Bank Compatibility Section */}
          <BankLogos 
            logos={BANK_LOGOS}
            heading="Works with your bank"
            subtext="Powered by Plaid • 11,000+ banks supported"
            showTopDivider={true}
          />
        </div>
      </div>

      {/* Footer */}
      <Footer showLogo={true} />

      {/* Background decorative elements */}
      <div className="absolute top-20 left-4 sm:left-10 w-16 sm:w-20 h-16 sm:h-20 bg-coral-300 rounded-full opacity-20 blur-xl animate-pulse"></div>
      <div className="absolute bottom-20 right-4 sm:right-10 w-24 sm:w-32 h-24 sm:h-32 bg-coral-400 rounded-full opacity-15 blur-2xl animate-pulse delay-1000"></div>
      <div className="absolute top-1/3 right-8 sm:right-20 w-12 sm:w-16 h-12 sm:h-16 bg-coral-200 rounded-full opacity-25 blur-lg animate-pulse delay-500"></div>
    </div>
  );
};

export default LandingPage;
