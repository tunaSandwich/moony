import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/Button/Button';
import phoneVideo from '@/assets/images/hand_and_phone_crop.mp4';
import logoText from '@/assets/icons/logo_text.png';
import logo from '@/assets/icons/logo.png';
import Lenis from 'lenis';

// Professional-grade easing utility functions
const lerp = (start: number, end: number, factor: number): number => start + (end - start) * factor;
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

const LandingPage = () => {
  const navigate = useNavigate();
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  // Page load animation state
  const [animationsComplete, setAnimationsComplete] = useState(false);
  
  // Professional animation direct variables (no async state issues)
  const smoothOpacityRef = useRef({
    currentSubtitleOpacity: 1,
    currentTitleOpacity: 1
  });
  
  const headerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const phoneRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | undefined>(null);
  const lenisRef = useRef<Lenis | null>(null);
  
  const handleGetStarted = () => {
    navigate('/invite');
  };

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleMediaChange);
    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, []);

  // Professional smooth scroll initialization
  useEffect(() => {
    if (prefersReducedMotion) return;

    // Initialize Lenis smooth scroll
    lenisRef.current = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Custom easeOutExpo
    });

    // Lenis animation loop
    const raf = (time: number) => {
      lenisRef.current?.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);

    return () => {
      lenisRef.current?.destroy();
    };
  }, [prefersReducedMotion]);

  // Set initial styles immediately on mount
  useEffect(() => {
    if (!titleRef.current || !subtitleRef.current || !buttonRef.current || !phoneRef.current) return;

    // Set initial styles immediately to prevent flash
    const elements = [titleRef.current, subtitleRef.current, buttonRef.current];
    elements.forEach(el => {
      el.style.opacity = '0.1';
      el.style.transform = 'translateY(20px) scale(0.95)';
    });

    phoneRef.current.style.opacity = '0';
    phoneRef.current.style.transform = 'translateY(40px)';
  }, []);

  // Ensure autoplay kicks in on mount for mobile browsers
  useEffect(() => {
    if (phoneRef.current) {
      const playPromise = phoneRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    }
  }, []);

  // Page load animations
  useEffect(() => {
    const executeAnimation = () => {
      if (!titleRef.current || !subtitleRef.current || !buttonRef.current || !phoneRef.current) return;

      const duration = prefersReducedMotion ? 100 : 1500; // 1.5s total or instant for reduced motion
      
      // Set transition properties
      const elements = [titleRef.current, subtitleRef.current, buttonRef.current];
      elements.forEach(el => {
        el.style.transition = prefersReducedMotion ? 'none' : 'all 0.6s ease-out';
      });

      phoneRef.current.style.transition = prefersReducedMotion ? 'none' : 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'; // Spring

      if (prefersReducedMotion) {
        // Instant appearance for reduced motion
        elements.forEach(el => {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0px) scale(1)';
        });
        phoneRef.current.style.opacity = '1';
        phoneRef.current.style.transform = 'translateY(0px)';
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

      // Phase 2: Phone spring animation (starts after 0.5s delay)
      setTimeout(() => {
        if (phoneRef.current) {
          phoneRef.current.style.opacity = '1';
          phoneRef.current.style.transform = 'translateY(0px)';
        }
      }, 1100); // 600ms text + 500ms delay

      // Mark animations complete
      setTimeout(() => {
        setAnimationsComplete(true);
      }, duration);
    };

    const timer = setTimeout(executeAnimation, 100); // Small delay for initial styles to apply
    return () => clearTimeout(timer);
  }, [prefersReducedMotion]);

  useEffect(() => {
    // Skip animations if user prefers reduced motion or page load animations still running
    if (prefersReducedMotion || !animationsComplete) return;

    // Detect CSS mask support for fallback
    const supportsCSSMask = typeof CSS !== 'undefined' && CSS.supports && 
      (CSS.supports('mask', 'linear-gradient(black, transparent)') || 
       CSS.supports('-webkit-mask', 'linear-gradient(black, transparent)'));
    
    // Performance optimization: Use simple opacity fallback for unsupported browsers
    const useSimpleFade = !supportsCSSMask;
    
    const calculateDistance = () => {
      if (!buttonRef.current || !titleRef.current || !subtitleRef.current) return;
      
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const buttonTop = buttonRect.top;
      
      // Get actual text element positions
      const titleRect = titleRef.current.getBoundingClientRect();
      const subtitleRect = subtitleRef.current.getBoundingClientRect();
      
      // Distance from button top to bottom of each text element
      const distanceToSubtitleBottom = buttonTop - subtitleRect.bottom;
      const distanceToTitleBottom = buttonTop - titleRect.bottom;
      
      // Professional eased opacity calculations (maintaining existing trigger distances)
      const rawSubtitleOpacity = distanceToSubtitleBottom <= 30 ? Math.max(0, (distanceToSubtitleBottom - 20) / 10) : 1;
      const rawTitleOpacity = distanceToTitleBottom <= 30 ? Math.max(0, (distanceToTitleBottom - 20) / 10) : 1;
      
      // Apply easing for organic feel
      const targetSubtitleOpacity = rawSubtitleOpacity < 1 ? easeOutCubic(rawSubtitleOpacity) : 1;
      const targetTitleOpacity = rawTitleOpacity < 1 ? easeOutCubic(rawTitleOpacity) : 1;

      // Direct interpolation (fixes async state issue)
      smoothOpacityRef.current.currentSubtitleOpacity = lerp(
        smoothOpacityRef.current.currentSubtitleOpacity, 
        targetSubtitleOpacity, 
        0.1
      );
      smoothOpacityRef.current.currentTitleOpacity = lerp(
        smoothOpacityRef.current.currentTitleOpacity, 
        targetTitleOpacity, 
        0.1
      );
      
      // Use interpolated values immediately (no async delay)
      const subtitleOpacity = smoothOpacityRef.current.currentSubtitleOpacity;
      const titleOpacity = smoothOpacityRef.current.currentTitleOpacity;

      // Optimized fade with accessibility and browser support
      if (useSimpleFade) {
        // Fallback: Simple opacity for unsupported browsers or reduced motion
        subtitleRef.current.style.opacity = subtitleOpacity.toString();
        titleRef.current.style.opacity = titleOpacity.toString();
        // Clear any existing masks
        subtitleRef.current.style.mask = '';
        subtitleRef.current.style.webkitMask = '';
        titleRef.current.style.mask = '';
        titleRef.current.style.webkitMask = '';
      } else {
        // Enhanced: Wrapper-based masking to preserve text gradients
        // Create wrapper elements to apply vertical fade without interfering with text gradient

        // Get or create wrapper elements
        const subtitleWrapper = subtitleRef.current.parentElement;
        const titleWrapper = titleRef.current.parentElement;

        // Apply fade through wrapper opacity rather than direct text masking
        // This preserves the background-clip text gradient while still achieving vertical fade
        if (subtitleWrapper) {
          if (subtitleOpacity >= 0.99) {
            // Remove mask when fully visible
            subtitleWrapper.style.mask = '';
            subtitleWrapper.style.webkitMask = '';
          } else {
            // Apply mask only when fading
            const subtitleFadeStart = 100 - (subtitleOpacity * 100);
            const subtitleFadeEnd = Math.min(100, subtitleFadeStart + 35);

            // Apply CSS mask to wrapper, preserving text gradient on inner element
            const subtitleMask = `linear-gradient(to top, transparent ${subtitleFadeStart}%, black ${subtitleFadeEnd}%)`;
            subtitleWrapper.style.mask = subtitleMask;
            subtitleWrapper.style.webkitMask = subtitleMask;
          }
          
          // Ensure text element maintains its gradient
          subtitleRef.current.style.opacity = '1';
          subtitleRef.current.style.mask = '';
          subtitleRef.current.style.webkitMask = '';
        }

        if (titleWrapper) {
          if (titleOpacity >= 0.99) {
            // Remove mask when fully visible
            titleWrapper.style.mask = '';
            titleWrapper.style.webkitMask = '';
          } else {
            // Apply mask only when fading
            const titleFadeStart = 100 - (titleOpacity * 100);
            const titleFadeEnd = Math.min(100, titleFadeStart + 35);
            
            // Apply CSS mask to wrapper, preserving text gradient on inner element  
            const titleMask = `linear-gradient(to top, transparent ${titleFadeStart}%, black ${titleFadeEnd}%)`;
            titleWrapper.style.mask = titleMask;
            titleWrapper.style.webkitMask = titleMask;
          }
          
          // Ensure text element maintains its gradient
          titleRef.current.style.opacity = '1';
          titleRef.current.style.mask = '';
          titleRef.current.style.webkitMask = '';
        }
      }
      
      // Enhanced debug logging for professional animation system
      const logData: Record<string, string | number> = {
        buttonTop: Math.round(buttonTop),
        subtitleBottom: Math.round(subtitleRect.bottom),
        titleBottom: Math.round(titleRect.bottom),
        distanceToSubtitleBottom: Math.round(distanceToSubtitleBottom),
        distanceToTitleBottom: Math.round(distanceToTitleBottom),
        subtitleOpacity: Math.round(subtitleOpacity * 100) / 100,
        titleOpacity: Math.round(titleOpacity * 100) / 100,
        targetSubtitle: Math.round(targetSubtitleOpacity * 100) / 100,
        targetTitle: Math.round(targetTitleOpacity * 100) / 100,
        interpolationFix: '🔧 DIRECT VARS (no async)',
        renderMode: useSimpleFade ? '🔄 OPACITY FALLBACK' : '🎭 BUTTERY SMOOTH',
        smoothScrollActive: lenisRef.current ? '✨ LENIS ACTIVE' : '❌ Disabled',
        maskSupport: supportsCSSMask ? '✅ Supported' : '❌ Fallback',
        subtitleState: subtitleOpacity < 1 ? 
          (useSimpleFade ? `🔄 SMOOTH OPACITY (${Math.round(subtitleOpacity * 100)}%)` : `🎭 SMOOTH MASK (${Math.round(subtitleOpacity * 100)}%)`) 
          : '⚪ Visible',
        titleState: titleOpacity < 1 ? 
          (useSimpleFade ? `🔄 SMOOTH OPACITY (${Math.round(titleOpacity * 100)}%)` : `🎭 SMOOTH MASK (${Math.round(titleOpacity * 100)}%)`) 
          : '⚪ Visible'
      };
      
      // Add gradient info only when using CSS masks
      if (!useSimpleFade) {
        const subtitleFadeStart = 100 - (subtitleOpacity * 100);
        const subtitleFadeEnd = Math.min(100, subtitleFadeStart + 35);
        const titleFadeStart = 100 - (titleOpacity * 100);
        const titleFadeEnd = Math.min(100, titleFadeStart + 35);
        
        logData.subtitleGradient = `${Math.round(subtitleFadeStart)}% → ${Math.round(subtitleFadeEnd)}%`;
        logData.titleGradient = `${Math.round(titleFadeStart)}% → ${Math.round(titleFadeEnd)}%`;
      }
      
      console.log(logData);
    };

    // Optimized RAF handling with throttling for mobile performance
    let lastScrollTime = 0;
    const handleScroll = () => {
      const now = performance.now();
      
      // Cancel previous frame if pending
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      
      // Mobile optimization: Throttle to prevent excessive calculations during fast scrolling
      if (now - lastScrollTime < 8) { // ~120fps limit to maintain smooth scrolling
        rafRef.current = requestAnimationFrame(calculateDistance);
        return;
      }
      
      lastScrollTime = now;
      rafRef.current = requestAnimationFrame(calculateDistance);
    };

    // Initial calculation
    calculateDistance();
    
    // Add scroll listener with passive option for performance (crucial for mobile)
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Add resize listener to recalculate on orientation change (mobile optimization)
    const handleResize = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(calculateDistance);
    };
    
    window.addEventListener('resize', handleResize, { passive: true });
    
    return () => {
      // Comprehensive cleanup to prevent memory leaks
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = undefined;
      }
    };
  }, [prefersReducedMotion, animationsComplete]);

  return (
    <div className="min-h-screen relative overflow-hidden" style={{backgroundColor: '#FFF8FC'}}>
      {/* Fixed Header with Logo and Strong Blur - Exactly 120px */}
      <header 
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-[25px]"
        style={{
          height: '60px',
          background: 'linear-gradient(to bottom, rgba(255, 248, 252, 0.9) 0%, rgba(255, 248, 252, 0.5) 50%, rgba(255, 248, 252, 0) 100%)',
        }}
        
      >
        {/* Logo in header */}
        <div className="absolute top-4 left-20 z-10">
          <img 
            src={logoText} 
            alt="moony Logo" 
            className="w-20 h-auto"
          />
        </div>
        
      </header>

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
          <div className="flex justify-center">
            <video
              ref={phoneRef}
              src={phoneVideo}
              aria-label="Budget tracking on mobile"
              className="w-full max-w-3xl h-auto mx-auto relative z-10 phone-fade-mask"
              style={{ 
                maxWidth: '1200px',
                width: 'min(90vw, 900px)',
                opacity: 0,
              }}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
            />
          </div>
        </div>
      </div>

      {/* Bottom Section - Extended for Testing */}
      <footer className="relative z-20 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Description */}
          <p className="text-lg sm:text-xl text-gray-700 mb-8 leading-relaxed">
            Connect your bank, connect your phone, set your spending goal and get daily sms updates tracking your progress
          </p>
          
          {/* Logo */}
          <div className="mb-8">
            <img 
              src={logo} 
              alt="moony Logo" 
              className="w-16 h-16 mx-auto"
            />
          </div>
          
          {/* Privacy Links */}
          <div className="flex justify-center items-center space-x-4 text-sm text-gray-600 mb-16">
            <a href="#" className="hover:text-gray-800 transition-colors">PRIVACY POLICY</a>
            <span>|</span>
            <a href="#" className="hover:text-gray-800 transition-colors">TERMS OF SERVICE</a>
            <span>|</span>
            <a href="#" className="hover:text-gray-800 transition-colors">LICENSE AGREEMENT</a>
          </div>
          
        </div>
      </footer>

      {/* Background decorative elements */}
      <div className="absolute top-20 left-4 sm:left-10 w-16 sm:w-20 h-16 sm:h-20 bg-coral-300 rounded-full opacity-20 blur-xl animate-pulse"></div>
      <div className="absolute bottom-20 right-4 sm:right-10 w-24 sm:w-32 h-24 sm:h-32 bg-coral-400 rounded-full opacity-15 blur-2xl animate-pulse delay-1000"></div>
      <div className="absolute top-1/3 right-8 sm:right-20 w-12 sm:w-16 h-12 sm:h-16 bg-coral-200 rounded-full opacity-25 blur-lg animate-pulse delay-500"></div>
    </div>
  );
};

export default LandingPage;
