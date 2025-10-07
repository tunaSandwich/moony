# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

moony is a Node.js/TypeScript application that provides automated daily spending tracking with bank integration via Plaid and messaging via Twilio/WhatsApp.

**Core Components:**
- **Main Daemon** (`src/index.ts`): Entry point that starts the scheduler and Express server
- **Express Server** (`src/server.ts`): REST API endpoints and static file serving for Plaid Link UI
- **Scheduler Service** (`src/services/schedulerService.ts`): Cron-based daily job orchestration 
- **Plaid Service** (`src/services/plaidService.ts`): Bank account and transaction data fetching
- **Calculation Service** (`src/services/calculationService.ts`): Monthly spending calculations and reporting
- **SMS Service** (`src/services/smsService.ts`): WhatsApp/SMS messaging with Twilio integration

**Data Flow:**
1. Plaid Link UI exchanges public tokens for access tokens (stored in `src/temp_access_token.json` for dev)
2. Daily scheduler fetches transactions from Plaid API
3. Calculations service computes monthly totals and averages
4. SMS service formats and sends WhatsApp updates via Twilio

## Development Commands

**Primary Development:**
- `npm run dev` - Watch mode for main daemon (server + scheduler)
- `npm start` - Run main daemon once (server + scheduler)

**Server Only:**
- `npm run dev:server` - Watch mode for Express server only
- `npm run start:server` - Run Express server once

**Testing & Manual Execution:**
- `npm run start:now` - Run daily job once from CLI
- `npm run run:now:local` - Trigger daily job via local API call
- `npm run run:now:remote` - Trigger daily job via remote API call (requires APP_URL env)
- `npm run test:plaid` - Test Plaid API connectivity
- `npm run test:transactions` - Fetch and display recent transactions
- `npm run test:account` - List accounts and sample transactions
- `npm run test:whatsapp` - Send test WhatsApp message

## Configuration

**Access Token Management:**
- Production: Set `PLAID_ACCESS_TOKEN` environment variable
- Development: Use Plaid Link UI at `http://localhost:3000` to generate `src/temp_access_token.json`

**Scheduler Configuration:**
- `SCHEDULER_ENABLED=true/false` - Enable/disable cron scheduler
- `DAILY_SMS_TIME=08:00` - Time for daily job (HH:mm format, 24-hour)
- `TZ` - Timezone for scheduler (defaults to system timezone)

**Key Environment Variables:**
- Plaid: `PLAID_ENV`, `PLAID_CLIENT_ID`, `PLAID_SECRET`
- Twilio WhatsApp: `TWILIO_WHATSAPP_FROM`, `YOUR_WHATSAPP_NUMBER`
- Messaging: `YOUR_NAME`, `DAILY_SPENDING_LIMIT`

## Important Implementation Details

**Transaction Processing:**
- Uses `date-fns` for date calculations and month boundaries
- Plaid transactions have positive amounts for debits (money spent)
- Monthly calculations include start/end dates inclusively

**Error Handling:**
- Services use comprehensive try/catch with detailed error logging
- WhatsApp service tries multiple number format variants automatically
- Scheduler jobs are fire-and-forget with internal error handling

**File Structure:**
- ES modules with `.js` extensions in imports (TypeScript requirement)
- Configuration files in `src/config/` (mixed .js/.ts for legacy reasons)
- Test files in `tests/` directory and `src/test-*.ts` for service testing
- Static UI files in `src/public/`

**Access Token Storage:**
- Development tokens stored in `src/temp_access_token.json` (gitignored)
- Production should use `PLAID_ACCESS_TOKEN` environment variable
- Token resolution checks env var first, then falls back to temp file

## Testing Considerations

There are no formal test suites. Use the provided test scripts:
- Test Plaid connectivity before making changes to PlaidService
- Use `test:whatsapp` to verify Twilio configuration
- Use `run:now:local` to test full daily job workflow locally

---

# Frontend Development Standards

## Design System Architecture

**Design System Foundation:**
The frontend uses a three-layer design system architecture:
1. **CSS Custom Properties** (`apps/web/src/index.css`) - Source of truth for all design tokens
2. **TypeScript Constants** (`apps/web/src/design-system/`) - Programmatic access to design values
3. **Tailwind Configuration** (`apps/web/tailwind.config.js`) - Maps CSS variables to utility classes

**Color System:**
- Primary theme: Pink/coral gradient (`#FFF8FC` to `#FCE7F3`)
- Always use semantic color names: `bg-pink-bg`, `text-primary`, `text-secondary`
- Glassmorphism effects available via `backdrop-blur-strong` and gradient variables

**Spacing System:**
- 4px base scale: `xs(4px)` → `sm(8px)` → `md(16px)` → `lg(24px)` → `xl(32px)` → `2xl(48px)` → `3xl(64px)` → `4xl(96px)`
- Use spacing constants from `design-system/spacing` for programmatic values
- Prefer Tailwind classes for layouts: `p-md`, `m-lg`, `gap-sm`

## Component Library Patterns

**Component Structure:**
```typescript
// Standard component structure
export interface ComponentProps {
  className?: string;          // Always support className override
  children?: React.ReactNode; // When applicable
  // Specific props with clear defaults
}

export const Component = forwardRef<HTMLElement, ComponentProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <element 
        ref={ref}
        className={`base-classes ${className}`}
        {...props}
      >
        {/* content */}
      </element>
    );
  }
);

Component.displayName = 'Component';
```

**File Organization:**
- Component folders: `src/components/{category}/{ComponentName}/`
- Main file: `ComponentName.tsx`
- Barrel exports: `index.ts` in each folder and category
- Shared types: `types.ts` when complex interfaces are needed

**Animation Components:**
- Always support `prefersReducedMotion` via `useReducedMotion` hook
- Use RAF optimization for scroll-based animations
- Provide fallbacks for unsupported browsers
- Example: `useScrollFade` for text fade effects, `PhoneVideo` for play-on-scroll

## Development Workflow

**Design System Usage:**
```typescript
// ✅ Correct - Use design system tokens
import { colors, spacing, animations } from '@/design-system';
style={{ background: colors.gradients.primary }}
className="text-primary p-lg backdrop-blur-strong"

// ❌ Incorrect - Hardcoded values
style={{ background: '#FFF8FC' }}
className="text-gray-900 p-6 backdrop-blur-sm"
```

**Import Conventions:**
```typescript
// ✅ Correct import order
import React, { forwardRef, useEffect, type RefObject } from 'react';
import { cn } from '@/utils/helpers';
import { colors, spacing } from '@/design-system';
import { useReducedMotion } from '@/hooks/animation';
import { Button } from '@/components/ui';

// ✅ Use type-only imports for types
import { type VariantProps } from 'class-variance-authority';
```

**Component Reusability:**
- Extract reusable logic into custom hooks (`useScrollFade`, `useSmoothScroll`)
- Create flexible props APIs that don't over-engineer
- Support both controlled and uncontrolled patterns when appropriate
- Use `forwardRef` for components that need ref access

## Performance Guidelines

**Animation Performance:**
- Use `requestAnimationFrame` for scroll-based animations
- Throttle high-frequency events (scroll, resize) to ~120fps max
- Implement proper cleanup in `useEffect` return functions
- Use CSS transforms over layout-affecting properties

**Bundle Optimization:**
- Lazy load heavy components with `React.lazy()`
- Use barrel exports (`index.ts`) for clean imports
- Prefer CSS custom properties over inline styles for better compression
- Dynamic imports for large dependencies

**Memory Management:**
```typescript
// ✅ Correct cleanup pattern
useEffect(() => {
  const handleScroll = () => { /* logic */ };
  window.addEventListener('scroll', handleScroll, { passive: true });
  
  return () => {
    window.removeEventListener('scroll', handleScroll);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
  };
}, []);
```

## Accessibility Standards

**Motion Preferences:**
- Always check `prefersReducedMotion` before animations
- Provide meaningful fallbacks for complex animations
- Use `{ passive: true }` for scroll event listeners

**Semantic HTML:**
- Use appropriate ARIA attributes: `role="presentation"`, `aria-hidden="true"`
- Maintain focus management in interactive components
- Ensure color contrast meets WCAG AA standards

**Screen Reader Support:**
- Provide alternative text for decorative images
- Use semantic heading hierarchy
- Include skip links for navigation

## Error Handling & Debugging

**Development vs Production:**
```typescript
// ✅ Conditional logging
if (import.meta.env.DEV) {
  console.log('Debug info:', data);
}

// ✅ Error boundaries for component isolation
try {
  // Component logic
} catch (error) {
  if (import.meta.env.DEV) {
    console.error('Component error:', error);
  }
  // Fallback UI
}
```

**Common Issues:**
- **TypeScript ref errors**: Use `RefObject<HTMLElement | null>` for flexible ref types
- **Build failures**: Check for duplicate exports in barrel files
- **Animation glitches**: Ensure RAF cleanup and throttling implementation
- **CSS conflicts**: Verify custom property naming doesn't conflict with Tailwind

## Anti-Patterns to Avoid

**Design System Violations:**
```typescript
// ❌ Never hardcode design values
style={{ background: '#FFF8FC', padding: '24px' }}

// ❌ Don't bypass the design system
className="bg-gray-100 text-black p-6"

// ❌ Avoid inconsistent spacing
style={{ marginTop: '23px', paddingLeft: '15px' }}
```

**Performance Anti-Patterns:**
```typescript
// ❌ Direct DOM manipulation in React
useEffect(() => {
  document.querySelector('.element').style.opacity = '0.5';
}, []);

// ❌ Missing cleanup
useEffect(() => {
  window.addEventListener('scroll', handleScroll);
  // Missing return cleanup function
}, []);

// ❌ Excessive re-renders
const Component = () => {
  const style = { background: colors.primary }; // Creates new object each render
  return <div style={style} />;
};
```

**Component Design Issues:**
```typescript
// ❌ Overly complex prop APIs
interface BadProps {
  showHeaderWithLogo?: boolean;
  enableAnimationsUnlessUserPrefersReducedMotion?: boolean;
  customStyleOverridesForInternalElements?: Record<string, CSSProperties>;
}

// ✅ Simple, focused APIs
interface GoodProps {
  showLogo?: boolean;
  animated?: boolean;
  className?: string;
}
```

## Checklist for New Features

**Before Implementation:**
- [ ] Review existing components for reusability
- [ ] Check if design tokens exist for your use case
- [ ] Identify animation requirements and reduced motion needs
- [ ] Plan component API for flexibility without complexity

**During Development:**
- [ ] Use design system tokens exclusively
- [ ] Implement proper TypeScript interfaces
- [ ] Add forwardRef support if component needs refs
- [ ] Include reduced motion alternatives
- [ ] Test in both development and production modes

**Before Commit:**
- [ ] Run `npm run build` to check for TypeScript errors
- [ ] Verify no console.log statements in production code
- [ ] Check bundle size impact with build analysis
- [ ] Test accessibility with screen reader navigation
- [ ] Validate responsive behavior across device sizes

**Testing Commands:**
- `npm run dev` - Start development server
- `npm run build` - Production build verification
- `npm run preview` - Test production build locally
