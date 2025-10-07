# Development Checklist

This checklist ensures consistent, high-quality frontend development for the budget_pal application.

## Pre-Development Setup

### Environment Verification
- [ ] Node.js and npm versions compatible with project
- [ ] Dependencies installed (`npm install`)
- [ ] Development server starts successfully (`npm run dev`)
- [ ] TypeScript compilation passes (`npm run build`)
- [ ] Git status clean or changes properly tracked

### Project Understanding  
- [ ] Review existing components in target area
- [ ] Check design system tokens for needed values
- [ ] Identify reusable patterns in similar components
- [ ] Understand animation and accessibility requirements
- [ ] Review CLAUDE.md and COMPONENTS.md for guidelines

## Component Development

### Design System Integration
- [ ] Use CSS custom properties from `src/index.css`
- [ ] Import design tokens from `@/design-system`
- [ ] Use semantic color names (`text-primary`, `bg-pink-bg`)
- [ ] Follow 4px spacing scale (`xs`, `sm`, `md`, `lg`, etc.)
- [ ] Apply glassmorphism effects via `backdrop-blur-strong`

### Component Structure
- [ ] Create folder structure: `src/components/{category}/{ComponentName}/`
- [ ] Main component file: `{ComponentName}.tsx`
- [ ] Export via barrel file: `index.ts`
- [ ] TypeScript interfaces defined with clear naming
- [ ] Support `className` prop for customization
- [ ] Use `forwardRef` when component needs ref access

### Code Quality
- [ ] TypeScript strict mode compliance
- [ ] Proper import organization (React → utils → design-system → hooks → components)
- [ ] Use type-only imports: `import { type RefObject }`
- [ ] No hardcoded values (colors, spacing, breakpoints)
- [ ] Consistent naming conventions
- [ ] Clear prop defaults and interfaces

### Animation Implementation
- [ ] Check reduced motion preference with `useReducedMotion`
- [ ] Use `requestAnimationFrame` for scroll-based animations
- [ ] Implement proper cleanup in `useEffect` return functions
- [ ] Throttle high-frequency events to ~120fps
- [ ] Provide meaningful fallbacks for unsupported browsers
- [ ] Test animation performance on mobile devices

### Accessibility Standards
- [ ] Semantic HTML elements and structure
- [ ] ARIA attributes where appropriate (`role`, `aria-label`, `aria-hidden`)
- [ ] Keyboard navigation support
- [ ] Screen reader compatibility
- [ ] Color contrast meets WCAG AA standards
- [ ] Focus management for interactive elements
- [ ] Alternative text for images and videos

## Testing & Validation

### Functional Testing
- [ ] Component renders correctly with default props
- [ ] All prop variations work as expected
- [ ] Ref forwarding functions properly
- [ ] Event handlers respond correctly
- [ ] Loading/error states display appropriately
- [ ] Component integrates properly with parent components

### Responsive Design
- [ ] Mobile layout (320px - 768px)
- [ ] Tablet layout (768px - 1024px)
- [ ] Desktop layout (1024px+)
- [ ] Text remains readable at all screen sizes
- [ ] Interactive elements maintain adequate touch targets
- [ ] Horizontal scrolling avoided on all breakpoints

### Cross-Browser Compatibility
- [ ] Chrome/Chromium browsers
- [ ] Firefox
- [ ] Safari (including mobile Safari)
- [ ] Edge
- [ ] CSS feature fallbacks implemented where needed
- [ ] JavaScript feature detection for advanced functionality

### Performance Validation
- [ ] Component doesn't cause excessive re-renders
- [ ] Event listeners use `{ passive: true }` where appropriate
- [ ] Large assets lazy-loaded when possible
- [ ] CSS animations use `transform` over layout properties
- [ ] Memory leaks prevented with proper cleanup

### Animation Quality
- [ ] Smooth 60fps performance on target devices
- [ ] Reduced motion preference respected
- [ ] Animation timing feels natural and purposeful
- [ ] No janky or stuttering motion
- [ ] Animations enhance rather than distract from content

## Build & Integration

### TypeScript Compilation
- [ ] `npm run build` succeeds without errors
- [ ] No TypeScript warnings or type assertion hacks
- [ ] Proper type exports for component props
- [ ] Generic types used appropriately
- [ ] No `any` types unless absolutely necessary

### Development Workflow
- [ ] Development server hot-reload works correctly
- [ ] No console errors in browser developer tools
- [ ] Component appears correctly in component explorer/storybook
- [ ] Bundle size impact assessed and justified
- [ ] No production console.log statements

### Code Review Preparation
- [ ] Code follows established patterns in codebase
- [ ] Comments explain complex business logic (not obvious code)
- [ ] Component is properly documented in COMPONENTS.md
- [ ] Examples provided for common use cases
- [ ] Breaking changes clearly noted and justified

## Production Readiness

### Performance Optimization
- [ ] Bundle analysis shows reasonable size increase
- [ ] Critical path CSS inlined where beneficial
- [ ] Images optimized and properly formatted
- [ ] Lazy loading implemented for below-fold content
- [ ] DNS prefetching for external resources

### Error Handling
- [ ] Error boundaries catch component failures gracefully
- [ ] User-friendly error messages provided
- [ ] Fallback UI displays for failed states
- [ ] Development vs production error handling differentiated
- [ ] Error tracking/logging implemented where appropriate

### Security Considerations
- [ ] No sensitive data exposed in client-side code
- [ ] External URLs properly validated
- [ ] XSS vulnerabilities prevented
- [ ] CSP compatibility maintained
- [ ] Third-party dependencies audited

## Documentation Updates

### Component Documentation
- [ ] COMPONENTS.md updated with new component
- [ ] Usage examples provided with code snippets
- [ ] Props interface clearly documented
- [ ] Common patterns and gotchas noted
- [ ] Integration examples with other components

### Development Guide Updates
- [ ] New patterns documented in CLAUDE.md
- [ ] Anti-patterns identified and documented
- [ ] Testing approaches updated if needed
- [ ] Performance considerations noted
- [ ] Architecture decisions recorded

## Git & Deployment

### Version Control
- [ ] Meaningful commit messages following project conventions
- [ ] Changes logically grouped in commits
- [ ] No sensitive information committed
- [ ] .gitignore updated for new file types if needed
- [ ] Branch naming follows project conventions

### Deployment Verification
- [ ] Production build deploys successfully
- [ ] Component functions in production environment
- [ ] CDN assets load correctly
- [ ] No console errors in production
- [ ] Performance metrics within acceptable ranges

## Maintenance Preparation

### Future Development
- [ ] Component API designed for extensibility
- [ ] Breaking changes minimized and well-documented
- [ ] Deprecation path planned for replaced components
- [ ] Migration guide provided for significant changes
- [ ] Backward compatibility maintained where possible

### Monitoring Setup
- [ ] Performance metrics tracked
- [ ] Error rates monitored
- [ ] User interaction analytics configured
- [ ] Bundle size changes tracked
- [ ] Accessibility metrics monitored

## Common Anti-Patterns to Avoid

### Design System Violations
- [ ] ❌ Hardcoded colors, spacing, or typography values
- [ ] ❌ Bypassing design system with custom CSS
- [ ] ❌ Inconsistent component prop naming
- [ ] ❌ Mixing design system tokens with hardcoded values

### Performance Issues
- [ ] ❌ Missing event listener cleanup
- [ ] ❌ Excessive DOM queries in render loops
- [ ] ❌ Inline style objects created on every render
- [ ] ❌ Heavy computations in render functions without memoization

### Accessibility Problems
- [ ] ❌ Missing ARIA labels on interactive elements
- [ ] ❌ Poor color contrast ratios
- [ ] ❌ Keyboard navigation not supported
- [ ] ❌ Screen reader content ignored or poorly structured

### TypeScript Issues
- [ ] ❌ Using `any` types without justification
- [ ] ❌ Incorrect ref typing patterns
- [ ] ❌ Missing or incomplete prop interfaces
- [ ] ❌ Type assertions used to bypass type checking

## Emergency Debugging Checklist

### Development Issues
1. **Dev server won't start:**
   - [ ] Check for port conflicts (`pkill -f "vite"`)
   - [ ] Verify node_modules installed
   - [ ] Check for TypeScript compilation errors

2. **Component not rendering:**
   - [ ] Verify proper import/export paths
   - [ ] Check for typos in component names
   - [ ] Ensure barrel exports updated

3. **Styling issues:**
   - [ ] Confirm CSS custom properties defined
   - [ ] Verify Tailwind config includes new classes
   - [ ] Check for CSS specificity conflicts

4. **Animation problems:**
   - [ ] Verify RAF cleanup implementation
   - [ ] Check reduced motion preference handling
   - [ ] Ensure proper event listener management

### Production Issues
1. **Build failures:**
   - [ ] Run TypeScript compilation locally
   - [ ] Check for missing dependencies
   - [ ] Verify environment variables set correctly

2. **Runtime errors:**
   - [ ] Check browser console for errors
   - [ ] Verify component error boundaries
   - [ ] Review network requests for failures

3. **Performance degradation:**
   - [ ] Analyze bundle size changes
   - [ ] Profile component render performance
   - [ ] Check for memory leaks in animations

This checklist ensures consistent, maintainable, and high-quality frontend development. Use it as a reference for both new feature development and code reviews.