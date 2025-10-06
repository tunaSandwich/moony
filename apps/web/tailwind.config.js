/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Colors - Map to CSS custom properties
      colors: {
        // Background colors
        'pink-bg': 'var(--color-bg-pink)',
        'coral-bg': 'var(--color-bg-coral)',
        
        // Primary color (keeping existing for backwards compatibility)
        primary: {
          DEFAULT: '#0698FE',
          dark: '#051327',
          light: '#C6E7FF',
        },
        
        // Coral scale
        coral: {
          50: 'var(--color-coral-50)',
          100: 'var(--color-coral-100)',
          200: 'var(--color-coral-200)',
          300: 'var(--color-coral-300)',
          400: 'var(--color-coral-400)',
          500: 'var(--color-coral-500)',
          600: 'var(--color-coral-600)',
          // Keep existing for backwards compatibility
          DEFAULT: '#FCE7F3',
        },
        
        // Text colors
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        
        // Semantic colors
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        
        // Grays - Map to CSS variables
        gray: {
          900: 'var(--color-gray-900)',
          700: 'var(--color-gray-700)',
          500: 'var(--color-gray-500)',
          300: 'var(--color-gray-300)',
          100: 'var(--color-gray-100)',
          50: 'var(--color-gray-50)',
        },
      },
      
      // Spacing - Map to CSS custom properties
      spacing: {
        'xs': 'var(--spacing-xs)',
        'sm': 'var(--spacing-sm)',
        'md': 'var(--spacing-md)',
        'lg': 'var(--spacing-lg)',
        'xl': 'var(--spacing-xl)',
        '2xl': 'var(--spacing-2xl)',
        '3xl': 'var(--spacing-3xl)',
        '4xl': 'var(--spacing-4xl)',
        '5xl': 'var(--spacing-5xl)',
        '6xl': 'var(--spacing-6xl)',
        '7xl': 'var(--spacing-7xl)',
        '8xl': 'var(--spacing-8xl)',
      },
      
      // Font family
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      
      // Font sizes - Map to CSS custom properties
      fontSize: {
        'h1': 'var(--font-size-h1)',
        'h2': 'var(--font-size-h2)',
        'h3': 'var(--font-size-h3)',
        'body-large': 'var(--font-size-body-large)',
        'body': 'var(--font-size-body)',
        'body-small': 'var(--font-size-body-small)',
        'caption': 'var(--font-size-caption)',
      },
      
      // Font weights
      fontWeight: {
        normal: 'var(--font-weight-normal)',
        medium: 'var(--font-weight-medium)',
        semibold: 'var(--font-weight-semibold)',
        bold: 'var(--font-weight-bold)',
      },
      
      // Border radius
      borderRadius: {
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
        'full': 'var(--radius-full)',
      },
      
      // Box shadows
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
      },
      
      // Backdrop blur
      backdropBlur: {
        'strong': 'var(--backdrop-blur-strong)',
        'medium': 'var(--backdrop-blur-medium)',
      },
      
      // Animation durations (in milliseconds - convert to seconds in usage)
      transitionDuration: {
        'instant': '100ms',
        'fast': '200ms',
        'normal': '300ms',
        'slow': '700ms',
      },
      
      // Custom transition timing functions
      transitionTimingFunction: {
        'default': 'var(--animation-easing-default)',
        'spring': 'var(--animation-easing-spring)',
        'expo': 'var(--animation-easing-expo)',
      },
    },
  },
  plugins: [],
}