/**
 * Design System - Central Export
 * 
 * Import from here to access all design tokens:
 * import { colors, spacing, fonts } from '@/design-system';
 */

export * from './colors';
export * from './spacing';
export * from './typography';
export * from './animations';

// Re-export as organized object for convenience
export { colors } from './colors';
export { spacing, spacingPx } from './spacing';
export { fonts, fontSizes, fontWeights, lineHeights } from './typography';
export { animationDurations, easingFunctions, easingStrings, lerp, easeOutCubic, easeOutExpo } from './animations';