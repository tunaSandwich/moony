import { useEffect, useRef, type RefObject } from 'react';
import { lerp, easeOutCubic } from '@/design-system';

interface ScrollFadeOptions {
  /**
   * Whether to disable scroll fade (e.g., for reduced motion)
   * @default false
   */
  disabled?: boolean;
  
  /**
   * Whether animations are complete (delays fade until ready)
   * @default true
   */
  animationsComplete?: boolean;
}

interface ScrollFadeElements {
  /**
   * Title element to fade
   */
  titleRef: RefObject<HTMLElement | null>;
  
  /**
   * Subtitle element to fade
   */
  subtitleRef: RefObject<HTMLElement | null>;
  
  /**
   * Button element used as scroll anchor
   */
  buttonRef: RefObject<HTMLElement | null>;
}

/**
 * Hook to handle scroll-based text fade animations
 * 
 * Implements sophisticated opacity interpolation and CSS masking
 * for smooth text fade effects as user scrolls past elements.
 * 
 * @param elements - Refs to title, subtitle, and button elements
 * @param options - Configuration options
 * 
 * @example
 * ```tsx
 * const titleRef = useRef<HTMLHeadingElement>(null);
 * const subtitleRef = useRef<HTMLParagraphElement>(null);
 * const buttonRef = useRef<HTMLButtonElement>(null);
 * 
 * useScrollFade(
 *   { titleRef, subtitleRef, buttonRef },
 *   { disabled: prefersReducedMotion, animationsComplete: true }
 * );
 * ```
 */
export function useScrollFade(
  { titleRef, subtitleRef, buttonRef }: ScrollFadeElements,
  { disabled = false, animationsComplete = true }: ScrollFadeOptions = {}
) {
  const rafRef = useRef<number | undefined>(undefined);
  const smoothOpacityRef = useRef({
    currentSubtitleOpacity: 1,
    currentTitleOpacity: 1
  });

  useEffect(() => {
    // Skip animations if disabled or page load animations still running
    if (disabled || !animationsComplete) return;

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
  }, [disabled, animationsComplete]);
}