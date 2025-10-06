import { useEffect, useRef } from 'react';
import Lenis from 'lenis';

interface SmoothScrollOptions {
  /**
   * Duration of the smooth scroll animation
   * @default 1.2
   */
  duration?: number;
  
  /**
   * Custom easing function
   * @default Expo ease out
   */
  easing?: (t: number) => number;
  
  /**
   * Whether to disable smooth scroll (e.g., for reduced motion)
   * @default false
   */
  disabled?: boolean;
}

/**
 * Hook to initialize Lenis smooth scrolling
 * 
 * @param options - Configuration options for smooth scroll
 * @returns Lenis instance ref for advanced usage
 * 
 * @example
 * ```tsx
 * const lenisRef = useSmoothScroll({
 *   duration: 1.2,
 *   disabled: prefersReducedMotion
 * });
 * ```
 */
export function useSmoothScroll(options: SmoothScrollOptions = {}) {
  const {
    duration = 1.2,
    easing = (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Custom easeOutExpo
    disabled = false
  } = options;

  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (disabled) return;

    // Initialize Lenis smooth scroll
    lenisRef.current = new Lenis({
      duration,
      easing,
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
  }, [duration, easing, disabled]);

  return lenisRef;
}