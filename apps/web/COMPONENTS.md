# Component Usage Guide

This guide provides comprehensive documentation for all frontend components in the budget_pal application.

## Design System Components

### Core Design System
Location: `src/design-system/`

```typescript
import { colors, spacing, typography, animations } from '@/design-system';

// Available exports:
// - colors: Color palette, semantic colors, gradients
// - spacing: 4px-based spacing scale (xs to 8xl)
// - typography: Font definitions and scales  
// - animations: Duration and easing functions
```

**Key Utilities:**
- `lerp(start, end, factor)` - Linear interpolation for smooth animations
- `easeOutCubic(t)` - Cubic easing function for organic motion

## Layout Components

### Header
Location: `src/components/layout/Header/`

**Purpose:** Fixed navigation header with glassmorphism effect and logo.

```typescript
import { Header } from '@/components/layout';

// Basic usage
<Header />

// With custom styling
<Header className="custom-class" showNav={true} />

// With ref for animations
const headerRef = useRef<HTMLElement>(null);
<Header ref={headerRef} />
```

**Props:**
- `className?: string` - Additional CSS classes
- `showNav?: boolean` - Display navigation menu (default: false)

**Features:**
- Fixed positioning with backdrop blur
- Uses design system gradients
- ForwardRef support for scroll animations
- Responsive logo sizing

### Footer
Location: `src/components/layout/Footer/`

**Purpose:** Reusable footer with configurable content and styling.

```typescript
import { Footer } from '@/components/layout';

// Minimal footer
<Footer />

// Full configuration
<Footer
  description="Custom description text"
  links={[
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' }
  ]}
  showLogo={true}
  className="custom-footer-class"
/>
```

**Props:**
- `description?: string` - Footer description text
- `links?: FooterLink[]` - Navigation links array
- `showLogo?: boolean` - Display footer logo (default: false)
- `className?: string` - Additional CSS classes

**Types:**
```typescript
interface FooterLink {
  label: string;
  href: string;
}
```

## UI Components

### Button
Location: `src/components/ui/Button/`

**Purpose:** Versatile button component with variants and loading states.

```typescript
import { Button } from '@/components/ui';

// Primary button
<Button>Click me</Button>

// Secondary variant
<Button variant="secondary" size="lg">
  Large Secondary
</Button>

// Loading state
<Button isLoading={true}>
  Processing...
</Button>

// With ref
const buttonRef = useRef<HTMLButtonElement>(null);
<Button ref={buttonRef}>Button</Button>
```

**Props:**
- `variant?: 'primary' | 'secondary' | 'ghost' | 'danger'` (default: 'primary')
- `size?: 'sm' | 'md' | 'lg' | 'xl'` (default: 'md')
- `isLoading?: boolean` - Shows spinner and disables button
- `className?: string` - Additional CSS classes
- All standard `ButtonHTMLAttributes`

**Features:**
- Class Variance Authority (CVA) for consistent styling
- Built-in loading spinner
- Hover animations with transform effects
- Focus ring accessibility
- ForwardRef support

### TopBar
Location: `src/components/ui/TopBar/`

**Purpose:** Decorative gradient bar for visual hierarchy.

```typescript
import { TopBar } from '@/components/ui';

// As overlay on existing containers
<div className="card">
  <TopBar />
  <div className="content">...</div>
</div>

// Standalone element
<TopBar overlay={false} radiusMode="none" />

// Custom styling
<TopBar 
  radiusMode="inherit" 
  className="custom-top-bar"
/>
```

**Props:**
- `className?: string` - Additional CSS classes
- `radiusMode?: 'default' | 'inherit' | 'none'` (default: 'default')
- `overlay?: boolean` - Absolute vs relative positioning (default: true)

**Features:**
- 4px gradient bar using design system colors
- Configurable border radius behavior
- Absolute overlay or standalone positioning
- ARIA attributes for accessibility

## Section Components

### BankLogos
Location: `src/components/sections/BankLogos/`

**Purpose:** Grid display of supported bank logos with responsive layout.

```typescript
import { BankLogos } from '@/components/sections';
import { BANK_LOGOS } from '@/data/bankLogos';

// Standard usage
<BankLogos logos={BANK_LOGOS} />

// Customized
<BankLogos
  logos={BANK_LOGOS}
  heading="Custom heading"
  subtext="Custom subtext"
  showTopDivider={false}
  className="custom-spacing"
/>
```

**Props:**
- `logos: BankLogo[]` - Array of logo objects (required)
- `heading?: string` - Section heading (default: "Works with your bank")
- `subtext?: string` - Subtitle text (default: "Powered by Plaid • 11,000+ banks supported")
- `showTopDivider?: boolean` - Display top divider line (default: true)
- `className?: string` - Additional CSS classes

**Types:**
```typescript
interface BankLogo {
  src: string;  // Image source
  alt: string;  // Alt text for accessibility
}
```

**Features:**
- Responsive grid layout (3 cols mobile, 4 cols tablet, 8 cols desktop)
- Grayscale hover effects
- Semantic heading structure
- Configurable divider elements

### PhoneVideo
Location: `src/components/sections/PhoneVideo/`

**Purpose:** Animated video component with scroll-based playback and phone frame styling.

```typescript
import { PhoneVideo } from '@/components/sections';
import phoneVideo from '@/assets/phone-video.mp4';

// Basic usage
<PhoneVideo videoSrc={phoneVideo} />

// Full configuration
const videoRef = useRef<HTMLVideoElement>(null);
<PhoneVideo
  ref={videoRef}
  videoSrc={phoneVideo}
  ariaLabel="App demonstration video"
  maxWidth="400px"
  playOnScroll={true}
  className="custom-video"
/>
```

**Props:**
- `videoSrc: string` - Video file source (required)
- `ariaLabel?: string` - Accessibility label for video
- `maxWidth?: string` - Maximum width constraint (default: "350px")
- `playOnScroll?: boolean` - Enable play-on-scroll behavior (default: false)
- `className?: string` - Additional CSS classes

**Features:**
- Play-on-scroll functionality with intersection observer
- Phone frame styling with realistic proportions
- Reduced motion support via `useReducedMotion`
- RAF-optimized scroll calculations
- Automatic video controls management
- ForwardRef support for animation coordination

**Advanced Usage:**
```typescript
// With animation coordination
const titleRef = useRef<HTMLHeadingElement>(null);
const subtitleRef = useRef<HTMLParagraphElement>(null);
const videoRef = useRef<HTMLVideoElement>(null);

useScrollFade(
  { titleRef, subtitleRef, buttonRef: videoRef },
  { animationsComplete: true }
);

<PhoneVideo ref={videoRef} videoSrc={phoneVideo} playOnScroll={true} />
```

## Integration Components

### PlaidLink
Location: `src/components/PlaidLink.tsx`

**Purpose:** Secure bank account connection component using Plaid Link.

```typescript
import { PlaidLink } from '@/components';

const BankConnection = () => {
  const handleSuccess = (hasConnectedBank: boolean) => {
    console.log('Bank connected:', hasConnectedBank);
    // Handle successful connection
  };

  const handleError = (error: string) => {
    console.error('Connection error:', error);
    // Handle connection error
  };

  return (
    <PlaidLink
      onSuccess={handleSuccess}
      onError={handleError}
    />
  );
};
```

**Props:**
- `onSuccess: (hasConnectedBank: boolean) => void` - Called when bank successfully connected
- `onError: (error: string) => void` - Called when connection fails

**Features:**
- Automatic Plaid Link token creation and management
- Secure public token exchange for access token
- Loading states during connection process
- Error handling with user-friendly messages
- Auto-opens Plaid Link when token is ready
- Security messaging for user confidence

**Workflow:**
1. User clicks "Connect Bank Account" button
2. Component creates Plaid Link token via API
3. Plaid Link interface opens automatically
4. User selects bank and authenticates
5. Public token exchanged for access token
6. Success/error callback triggered

## Animation Hooks

### useReducedMotion
Location: `src/hooks/animation/useReducedMotion.ts`

**Purpose:** Detects user's motion preference for accessibility.

```typescript
import { useReducedMotion } from '@/hooks/animation';

const MyComponent = () => {
  const prefersReducedMotion = useReducedMotion();
  
  return (
    <div className={prefersReducedMotion ? 'no-animation' : 'with-animation'}>
      Content
    </div>
  );
};
```

**Returns:** `boolean` - True if user prefers reduced motion

### useSmoothScroll
Location: `src/hooks/animation/useSmoothScroll.ts`

**Purpose:** Initializes Lenis smooth scrolling with configuration.

```typescript
import { useSmoothScroll } from '@/hooks/animation';

const App = () => {
  useSmoothScroll({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 2
  });
  
  return <div>App content</div>;
};
```

**Options:**
- `duration?: number` - Scroll animation duration
- `easing?: (t: number) => number` - Easing function
- `smoothWheel?: boolean` - Enable smooth wheel scrolling
- `touchMultiplier?: number` - Touch scroll sensitivity

### useScrollFade
Location: `src/hooks/animation/useScrollFade.ts`

**Purpose:** Sophisticated scroll-based text fade animation with CSS masking.

```typescript
import { useScrollFade } from '@/hooks/animation';

const HeroSection = () => {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const prefersReducedMotion = useReducedMotion();
  
  useScrollFade(
    { titleRef, subtitleRef, buttonRef },
    { 
      disabled: prefersReducedMotion,
      animationsComplete: true 
    }
  );
  
  return (
    <div>
      <h1 ref={titleRef}>Title</h1>
      <p ref={subtitleRef}>Subtitle</p>
      <button ref={buttonRef}>Scroll anchor</button>
    </div>
  );
};
```

**Parameters:**
- `elements: ScrollFadeElements` - Refs to title, subtitle, and button elements
- `options?: ScrollFadeOptions` - Configuration options

**Types:**
```typescript
interface ScrollFadeElements {
  titleRef: RefObject<HTMLElement | null>;
  subtitleRef: RefObject<HTMLElement | null>;
  buttonRef: RefObject<HTMLElement | null>;  // Used as scroll anchor
}

interface ScrollFadeOptions {
  disabled?: boolean;           // Disable animations (default: false)
  animationsComplete?: boolean; // Delay fade until ready (default: true)
}
```

**Features:**
- CSS mask-based vertical fade for smooth text transitions
- Preserves text gradients while applying fade effects
- Fallback to simple opacity for unsupported browsers
- RAF optimization with 120fps throttling
- Proper cleanup to prevent memory leaks
- Mobile-optimized performance

### useScrollProgress
Location: `src/hooks/useScrollProgress.ts`

**Purpose:** Tracks scroll progress as percentage for scroll-based animations.

```typescript
import { useScrollProgress } from '@/hooks';

const ScrollIndicator = () => {
  const { scrollProgress, scrollY } = useScrollProgress({
    maxScroll: 1000, // Max scroll distance for 100% progress
    debug: false     // Enable console logging
  });

  return (
    <div className="fixed top-0 left-0 w-full h-1 bg-gray-200">
      <div 
        className="h-full bg-primary transition-all"
        style={{ width: `${scrollProgress * 100}%` }}
      />
      <p>Progress: {Math.round(scrollProgress * 100)}%</p>
    </div>
  );
};
```

**Parameters:**
- `maxScroll: number` - Scroll distance at which progress reaches 100%
- `debug?: boolean` - Enable console logging for debugging (default: false)

**Returns:**
```typescript
interface ScrollProgressReturn {
  scrollProgress: number; // 0-1 representing scroll percentage
  scrollY: number;        // Current scroll position in pixels
}
```

**Features:**
- Throttled scroll events with requestAnimationFrame
- Passive event listeners for better performance
- Clamped progress values (never exceeds 1.0)
- Debug mode with detailed scroll metrics
- Automatic cleanup on component unmount

## Data Files

### Bank Logos
Location: `src/data/bankLogos.ts`

**Purpose:** Centralized bank logo data for reusability.

```typescript
import { BANK_LOGOS } from '@/data/bankLogos';

// Available logos:
// - Chase Bank
// - Bank of America  
// - Wells Fargo
// - JPMorgan Chase
// - Citibank
// - US Bank
// - PNC Bank
// - Capital One
```

**Type:**
```typescript
interface BankLogo {
  src: string;  // Image import
  alt: string;  // Accessibility text
}
```

## Development Patterns

### Component Creation Checklist
1. **Structure:** Use standard component folder structure
2. **Props:** Support `className` and appropriate defaults
3. **Refs:** Use `forwardRef` when component needs ref access
4. **Types:** Define clear TypeScript interfaces
5. **Accessibility:** Include ARIA attributes and semantic HTML
6. **Motion:** Support reduced motion preferences
7. **Exports:** Add to appropriate barrel exports (`index.ts`)

### Performance Best Practices
1. **Animations:** Use RAF for scroll-based effects
2. **Event Listeners:** Include `{ passive: true }` option
3. **Cleanup:** Implement proper useEffect cleanup
4. **Throttling:** Limit high-frequency events to ~120fps
5. **Fallbacks:** Provide alternatives for unsupported features

### Testing Components
```typescript
// Manual testing workflow
npm run dev              // Start dev server
npm run build           // Check TypeScript compilation
npm run preview         // Test production build

// Component-specific testing
// 1. Test with/without props
// 2. Verify ref forwarding
// 3. Check reduced motion behavior
// 4. Validate responsive breakpoints
// 5. Test accessibility with screen readers
```

## Common Gotchas

### TypeScript Issues
```typescript
// ❌ Incorrect ref typing
const ref = useRef<HTMLElement>();

// ✅ Correct ref typing for flexibility
const ref = useRef<HTMLElement | null>(null);

// ❌ Missing type-only imports
import { RefObject } from 'react';

// ✅ Type-only imports
import { type RefObject } from 'react';
```

### Animation Performance
```typescript
// ❌ Missing cleanup
useEffect(() => {
  window.addEventListener('scroll', handleScroll);
}, []);

// ✅ Proper cleanup
useEffect(() => {
  window.addEventListener('scroll', handleScroll, { passive: true });
  return () => window.removeEventListener('scroll', handleScroll);
}, []);
```

### Design System Usage
```typescript
// ❌ Hardcoded values
className="bg-gray-100 p-6"

// ✅ Design system tokens
className="bg-pink-bg p-lg"
```

This component library provides a solid foundation for building consistent, accessible, and performant React applications. All components follow established patterns and integrate seamlessly with the design system.