/**
 * Design System: Typography
 * 
 * Font definitions, sizes, weights, and line heights
 */

export const fonts = {
  primary: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
} as const;

export const fontSizes = {
  h1: '2.25rem',      // 36px
  h2: '1.875rem',     // 30px
  h3: '1.5rem',       // 24px
  bodyLarge: '1.125rem', // 18px
  body: '1rem',       // 16px
  bodySmall: '0.875rem', // 14px
  caption: '0.75rem', // 12px
} as const;

export const fontWeights = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const lineHeights = {
  tight: 1.2,
  normal: 1.4,
  relaxed: 1.6,
} as const;