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
    const containerRef = useRef<HTMLDivElement>(null);
    const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);
    
    // Use forwarded ref or internal ref
    const videoRef = (ref as React.RefObject<HTMLVideoElement>) || internalRef;

    // Autoplay video when user scrolls AND video enters viewport
    useEffect(() => {
      if (!playOnScroll || !videoRef.current || prefersReducedMotion) return;
      
      const currentVideoRef = videoRef.current;
      let hasScrolled = false;
      let hasPlayed = false;
      let observer: IntersectionObserver | null = null;
      
      // Wait for first scroll before enabling video autoplay
      const handleScroll = () => {
        if (!hasScrolled) {
          hasScrolled = true;
          
          // Now that user has scrolled, set up intersection observer
          observer = new IntersectionObserver(
            (entries) => {
              entries.forEach(entry => {
                if (entry.isIntersecting && videoRef.current && !hasPlayed) {
                  hasPlayed = true;
                  const playPromise = videoRef.current.play();
                  if (playPromise !== undefined) {
                    playPromise.catch(() => {
                      // Video play was prevented (e.g., browser autoplay policy)
                      // Silently handle - not a critical error
                    });
                  }
                }
              });
            },
            {
              threshold: 0.5 // Trigger when 50% of the video is in viewport
            }
          );
          
          observer.observe(currentVideoRef);
          
          // Remove scroll listener after first scroll
          window.removeEventListener('scroll', handleScroll);
        }
      };
      
      window.addEventListener('scroll', handleScroll, { passive: true });
      
      return () => {
        window.removeEventListener('scroll', handleScroll);
        if (observer) {
          observer.unobserve(currentVideoRef);
        }
      };
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

    // Mobile tap controls behavior
    useEffect(() => {
      if (!videoRef.current) return;
      
      const video = videoRef.current;
      const isMobile = 'ontouchstart' in window;
      
      if (!isMobile) return;
      
      // Initially hide controls
      video.removeAttribute('controls');
      
      const showControls = () => {
        video.setAttribute('controls', 'true');
        
        // Clear existing timer
        if (hideControlsTimer.current) {
          clearTimeout(hideControlsTimer.current);
        }
        
        // Hide after 3 seconds
        hideControlsTimer.current = setTimeout(() => {
          video.removeAttribute('controls');
        }, 3000);
      };
      
      const handleTap = (e: Event) => {
        e.preventDefault();
        if (video.hasAttribute('controls')) {
          video.removeAttribute('controls');
          if (hideControlsTimer.current) {
            clearTimeout(hideControlsTimer.current);
          }
        } else {
          showControls();
        }
      };
      
      video.addEventListener('click', handleTap);
      
      return () => {
        video.removeEventListener('click', handleTap);
        if (hideControlsTimer.current) {
          clearTimeout(hideControlsTimer.current);
        }
      };
    }, [videoRef]);

    return (
      <div className={`flex justify-center ${className}`} ref={containerRef}>
        <div className="relative video-container" style={{ maxWidth, width: 'min(90vw, 900px)' }}>
          <video
            ref={videoRef}
            src={videoSrc}
            aria-label={ariaLabel}
            className="w-full h-auto mx-auto relative z-10 phone-fade-mask video-hover-controls"
            style={{
              opacity: 0, // Initial state
            }}
            controls
            controlsList="nodownload"
            muted
            playsInline
            preload="auto"
          />
        </div>
      </div>
    );
  }
);

PhoneVideo.displayName = 'PhoneVideo';
