import { useEffect, useState, useCallback } from 'react';

interface ScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
}

export const useScrollAnimation = (_options: ScrollAnimationOptions = {}) => {
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const throttle = useCallback((func: (...args: any[]) => void, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    let lastExecTime = 0;
    return function (this: any, ...args: any[]) {
      const currentTime = Date.now();

      if (currentTime - lastExecTime > delay) {
        func.apply(this, args);
        lastExecTime = currentTime;
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func.apply(this, args);
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    };
  }, []);

  const handleScroll = useCallback(
    throttle(() => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);
      
      // Check if user prefers reduced motion
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) return;
      
      // Update visibility based on scroll position
      setIsVisible(currentScrollY > 50);
    }, 16), // ~60fps
    []
  );

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setIsVisible(false);
      return;
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Call once to set initial state

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  const getTextAnimationProps = useCallback((factor = 1) => {
    const progress = Math.min(scrollY / (window.innerHeight * 0.5), 1);
    const opacity = Math.max(1 - progress * factor, 0);
    const scale = Math.max(1 - progress * 0.1 * factor, 0.9);

    return {
      opacity,
      transform: `scale(${scale})`,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    };
  }, [scrollY]);

  const getHeaderBlurProps = useCallback(() => {
    const progress = Math.min(scrollY / 200, 1);
    const blur = 5 + (progress * 45); // 5 to 50

    return {
      backdropFilter: `blur(${blur}px)`,
      backgroundColor: `rgba(255, 248, 252, ${0.9})`,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    };
  }, [scrollY]);

  return {
    scrollY,
    isVisible,
    getTextAnimationProps,
    getHeaderBlurProps,
  };
};
