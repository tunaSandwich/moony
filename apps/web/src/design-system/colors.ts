/**
 * Design System: Colors
 * 
 * Single source of truth for all color values.
 * These match the CSS custom properties in index.css
 */

export const colors = {
  // Background Colors
  background: {
    pink: '#FFF8FC',
    coral: '#FFF8FC',
  },
  
  // Coral Scale
  coral: {
    50: '#FDF2F8',
    100: '#FFF8FC',
    200: '#FBCFE8',
    300: '#F9A8D4',
    400: '#F472B6',
    500: '#EC4899',
    600: '#DB2777',
  },
  
  // Text Colors
  text: {
    primary: '#1E1E1E',
    secondary: '#848484',
  },
  
  // Semantic Colors
  semantic: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#F472B6',
  },
  
  // Neutral Grays
  gray: {
    900: '#111827',
    700: '#374151',
    500: '#6B7280',
    300: '#D1D5DB',
    100: '#F3F4F6',
    50: '#F9FAFB',
  },
  
  white: '#FFFFFF',
} as const;

// Gradient Definitions
export const gradients = {
  text: 'linear-gradient(90deg, #848484 0%, #1E1E1E 50%, #848484 100%)',
  header: 'linear-gradient(to bottom, rgba(255, 248, 252, 0.9) 0%, rgba(255, 248, 252, 0.5) 50%, rgba(255, 248, 252, 0) 100%)',
} as const;

// Glassmorphism Effects
export const glass = {
  background: 'rgba(255, 255, 255, 0.1)',
  border: 'rgba(255, 255, 255, 0.2)',
} as const;
