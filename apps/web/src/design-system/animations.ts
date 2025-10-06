/**
 * Design System: Animations
 * 
 * Animation durations, easing functions, and utilities
 */

export const animationDurations = {
  instant: 100,     // ms
  fast: 200,        // ms
  normal: 300,      // ms
  slow: 700,        // ms
  pageLoad: 1500,   // ms
} as const;

export const easingFunctions = {
  default: [0.4, 0, 0.2, 1] as const,
  spring: [0.34, 1.56, 0.64, 1] as const,
  expo: [0.16, 1, 0.3, 1] as const,
} as const;

// CSS easing strings
export const easingStrings = {
  default: 'cubic-bezier(0.4, 0, 0.2, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  expo: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

// Utility functions for animations
export const lerp = (start: number, end: number, factor: number): number => 
  start + (end - start) * factor;

export const easeOutCubic = (t: number): number => 
  1 - Math.pow(1 - t, 3);

export const easeOutExpo = (t: number): number => 
  Math.min(1, 1.001 - Math.pow(2, -10 * t));