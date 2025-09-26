import { useState, useEffect, useCallback } from 'react';

interface ScrollProgressConfig {
  maxScroll: number;
  debug?: boolean;
}

interface ScrollProgressReturn {
  scrollProgress: number;
  scrollY: number;
}

export const useScrollProgress = ({ 
  maxScroll, 
  debug = false 
}: ScrollProgressConfig): ScrollProgressReturn => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    const progress = Math.min(currentScrollY / maxScroll, 1);
    
    setScrollY(currentScrollY);
    setScrollProgress(progress);
    
    if (debug) {
      console.log('Scroll Debug:', {
        scrollY: currentScrollY,
        maxScroll,
        progress: Math.round(progress * 100) / 100,
        progressPercent: `${Math.round(progress * 100)}%`
      });
    }
  }, [maxScroll, debug]);

  useEffect(() => {
    let ticking = false;
    
    const throttledScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    // Set initial values
    handleScroll();
    
    // Add scroll listener with passive flag for better performance
    window.addEventListener('scroll', throttledScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', throttledScroll);
    };
  }, [handleScroll]);

  return { scrollProgress, scrollY };
};