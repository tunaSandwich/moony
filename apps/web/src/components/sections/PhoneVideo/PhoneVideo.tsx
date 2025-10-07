import { useEffect, useRef, forwardRef } from 'react';
import { useReducedMotion } from '@/hooks/animation';
import { easingStrings } from '@/design-system';

export interface PhoneVideoProps {
  /**
   * Video source URL or imported video
   */
  videoSrc: string;
  
  /**
   * Alt text for accessibility
   */
  ariaLabel?: string;
  
  /**
   * Maximum width (Tailwind class or custom style)
   */
  maxWidth?: string;
  
  /**
   * Whether video should auto-play on scroll
   */
  playOnScroll?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * PhoneVideo Component
 * 
 * Displays a video mockup with sophisticated animations:
 * - Spring animation on page load
 * - Play on first scroll (optional)
 * - Fade mask at bottom
 * - Reduced motion support
 * 
 * Features:
 * - Ref forwarding for parent animations
 * - Configurable playback behavior
 * - Accessibility support
 * - Performance optimized
 */
export const PhoneVideo = forwardRef<HTMLVideoElement, PhoneVideoProps>(
  (
    {
      videoSrc,
      ariaLabel = 'Product demonstration video',
      maxWidth = '1200px',
      playOnScroll = true,
      className = '',
    },
    ref
  ) => {
    const prefersReducedMotion = useReducedMotion();
    const internalRef = useRef<HTMLVideoElement>(null);
    
    // Use forwarded ref or internal ref
    const videoRef = (ref as React.RefObject<HTMLVideoElement>) || internalRef;

    // Play video on first scroll
    useEffect(() => {
      if (!playOnScroll || !videoRef.current || prefersReducedMotion) return;
      
      let hasStarted = false;

      const handleFirstScroll = () => {
        if (hasStarted || !videoRef.current) return;
        hasStarted = true;
        
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Video play was prevented (e.g., browser autoplay policy)
            // Silently handle - not a critical error
          });
        }
        
        window.removeEventListener('scroll', handleFirstScroll);
      };

      window.addEventListener('scroll', handleFirstScroll, { passive: true });
      
      return () => window.removeEventListener('scroll', handleFirstScroll);
    }, [playOnScroll, prefersReducedMotion, videoRef]);

    // Set initial styles on mount
    useEffect(() => {
      if (!videoRef.current) return;

      // Set initial hidden state immediately to prevent flash
      videoRef.current.style.opacity = '0';
      videoRef.current.style.transform = 'translateY(40px)';
    }, [videoRef]);

    // Page load animation
    useEffect(() => {
      if (!videoRef.current) return;
      
      // Set transition property
      videoRef.current.style.transition = prefersReducedMotion 
        ? 'none' 
        : `all 0.4s ${easingStrings.spring}`;

      if (prefersReducedMotion) {
        // Instant appearance
        videoRef.current.style.opacity = '1';
        videoRef.current.style.transform = 'translateY(0px)';
        return;
      }

      // Animate after delay (to coordinate with text animations)
      const timer = setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.style.opacity = '1';
          videoRef.current.style.transform = 'translateY(0px)';
        }
      }, 1100); // 600ms text + 500ms delay

      return () => clearTimeout(timer);
    }, [prefersReducedMotion, videoRef]);

    return (
      <div className={`flex justify-center ${className}`}>
        <video
          ref={videoRef}
          src={videoSrc}
          aria-label={ariaLabel}
          className="w-full h-auto mx-auto relative z-10 phone-fade-mask"
          style={{
            maxWidth,
            width: 'min(90vw, 900px)',
            opacity: 0, // Initial state
          }}
          loop
          muted
          playsInline
          preload="auto"
        />
      </div>
    );
  }
);

PhoneVideo.displayName = 'PhoneVideo';
