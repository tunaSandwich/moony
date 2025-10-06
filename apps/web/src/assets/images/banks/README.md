# Bank Logos Directory

This directory contains bank logos for the "Works with your bank" section on the landing page.

## Current Status
- ✅ **Placeholder SVG files created** - Functional grey placeholder logos for testing
- ✅ **Landing page integration complete** - Bank compatibility section added to footer
- ✅ **Responsive layout implemented** - 2×4 grid on mobile, 4×2 grid on desktop

## Next Steps for Production

### 1. Replace Placeholder SVGs with Actual Bank Logos

Download official bank logos from:

**Primary Sources:**
- **Brandfetch.com** (recommended) - Search by bank name, download PNG format
- **Bank official press pages** - Most reliable for brand compliance

**Required Banks (Priority Order):**
1. `chase.png` - Chase Bank
2. `bank-of-america.png` - Bank of America  
3. `wells-fargo.png` - Wells Fargo
4. `capital-one.png` - Capital One
5. `citi.png` - Citibank
6. `american-express.png` - American Express
7. `usaa.png` - USAA
8. `schwab.png` - Charles Schwab

**Logo Requirements:**
- **Format**: PNG with transparent background
- **Style**: Greyscale (no color) to match #FFF8FC background
- **Size**: At least 200px height for quality
- **File size**: Under 50KB each (optimize for web)
- **Aspect ratio**: Maintain original proportions

### 2. Update Import Statements

When replacing SVGs with PNGs, update `/src/pages/LandingPage.tsx`:

```typescript
// Change these imports from .svg to .png
import chaseLogo from '@/assets/images/banks/chase.png';
import boaLogo from '@/assets/images/banks/bank-of-america.png';
// ... etc for all 8 banks
```

### 3. Logo Conversion Guide

If only color versions are available:
1. Open in image editor (Photoshop, GIMP, etc.)
2. Convert to greyscale: Image → Adjustments → Desaturate
3. Adjust contrast if needed for visibility
4. Export as PNG with transparency

### 4. Brand Compliance

- Use official bank logos only
- Do not modify logos beyond greyscale conversion
- Ensure proper trademark attribution if required
- Consider adding disclaimer: "All trademarks are property of their respective owners"

### 5. Testing Checklist

After replacing logos:
- [ ] All 8 logos display correctly
- [ ] Greyscale styling matches design
- [ ] Mobile layout (2×2) works properly  
- [ ] Desktop layout (4×2) works properly
- [ ] Hover effects function (70% → 90% opacity)
- [ ] Page load performance acceptable
- [ ] Images optimize correctly for different screen densities

## Current Implementation

The landing page footer now includes:
- Horizontal divider line
- "Works with your bank" heading
- 8 bank logos in responsive grid
- "Powered by Plaid • 11,000+ banks supported" subtext

**Layout Specifications:**
- Logo height: 40px (maintains aspect ratio)
- Grid: 2 columns (mobile) / 4 columns (desktop)
- Spacing: 32px gap (mobile) / 48px gap (desktop)  
- Opacity: 70% default, 90% on hover
- Transition: 200ms smooth opacity change