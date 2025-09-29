# Moony - Frontend Web Application

A modern React application built with TypeScript, Tailwind CSS, and Vite for the Moony spending tracking platform.

## 🚀 Quick Start

### Prerequisites
- Node.js 21+ (current version: v21.7.1)
- npm 10+ (current version: 10.5.0)

### Installation & Development

```bash
# Navigate to web app directory
cd apps/web

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`

## 🛠 Technology Stack

### Core Technologies
- **React 19.1+** - Modern UI library with concurrent features
- **TypeScript 5.8+** - Static type checking and enhanced developer experience
- **Vite 7.1+** - Fast build tool and development server
- **Tailwind CSS 4.1+** - Utility-first CSS framework

### State Management & Forms
- **Zustand 5.0+** - Lightweight, flexible state management
- **React Hook Form 7.62+** - Performant forms with minimal re-renders
- **Zod 4.1+** - TypeScript-first schema validation

### Development Tools
- **ESLint** - Code linting and quality assurance
- **Prettier** - Consistent code formatting
- **Vitest** - Fast unit testing framework
- **TypeScript** - Static type checking

## 📁 Project Structure

```
apps/web/
├── src/
│   ├── components/
│   │   └── ui/                 # Reusable UI components
│   │       └── Button/         # Button component with variants
│   ├── utils/
│   │   └── helpers.ts          # Utility functions (cn, formatters, etc.)
│   ├── types/
│   │   └── index.ts            # TypeScript type definitions
│   ├── hooks/                  # Custom React hooks (planned)
│   ├── App.tsx                 # Main application component
│   ├── main.tsx                # Application entry point
│   └── index.css               # Global styles with Tailwind directives
├── public/                     # Static assets
├── tailwind.config.js          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
├── vite.config.ts              # Vite build configuration
└── package.json                # Dependencies and scripts
```

## 🎨 Design System

### Color Palette
- **Primary**: `#0698FE` (Bright Blue)
- **Primary Dark**: `#051327` (Hover states)
- **Primary Light**: `#C6E7FF` (Light backgrounds)
- **Success**: `#10B981` (Green)
- **Warning**: `#F59E0B` (Orange)
- **Error**: `#F472B6` (Pink)

### Typography
- **Font Family**: Inter (Google Fonts)
- **Weights**: 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)

### Component Classes
Pre-built CSS classes for consistent styling:
- `.btn-primary` - Primary button styling
- `.btn-secondary` - Secondary button styling
- `.form-input` - Input field styling
- `.form-label` - Form label styling
- `.card` - Card container styling
- `.container` - Page container with responsive padding

## 🧩 Component Architecture

### Button Component
Located at `src/components/ui/Button/`

**Usage:**
```tsx
import { Button } from '@/components/ui/Button';

// Primary button
<Button variant="primary" size="lg">
  Get Started
</Button>

// Secondary button
<Button variant="secondary" size="md">
  Learn More
</Button>

// With loading state
<Button isLoading={true}>
  Processing...
</Button>
```

**Variants:**
- `primary` - Blue background, white text
- `secondary` - White background, blue border
- `ghost` - Transparent background
- `danger` - Red background, white text

**Sizes:**
- `sm` - Small (32px height)
- `md` - Medium (40px height)
- `lg` - Large (48px height)
- `xl` - Extra Large (56px height)

## 📝 Available Scripts

### Development
```bash
npm run dev          # Start development server on port 3000
npm run build        # Build for production
npm run preview      # Preview production build locally
```

### Code Quality
```bash
npm run lint         # Run ESLint
npm run lint:fix     # Run ESLint with auto-fix
npm run format       # Format code with Prettier
npm run format:check # Check if code is formatted
npm run typecheck    # Run TypeScript type checking
```

### Testing
```bash
npm run test         # Run tests with Vitest
npm run test:ui      # Run tests with UI interface
npm run test:coverage # Run tests with coverage report
```

## 🔧 Configuration

### Environment Variables
Create a `.env.local` file for environment-specific configuration:

```bash
# API Configuration
VITE_API_URL=http://localhost:3001/api

# Feature Flags
VITE_APP_VERSION=1.0.0
```

### Path Aliases
Configured in `vite.config.ts` and `tsconfig.app.json`:
- `@/*` maps to `./src/*`

**Usage:**
```tsx
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/utils/helpers';
```

## 🚧 Current Implementation

### What's Built
✅ **Project Setup**
- Vite + React + TypeScript foundation
- Tailwind CSS with custom design system
- ESLint + Prettier configuration
- Path aliases and build optimization

✅ **Design System**
- Color palette implementation
- Typography with Inter font
- Utility classes for common patterns
- Responsive container system

✅ **Base Components**
- Button component with multiple variants and sizes
- Loading states and accessibility features
- Type-safe props with class-variance-authority

✅ **Demo Application**
- Landing page showcasing design system
- Interactive button demonstrations
- Responsive layout with header/footer
- Feature showcase cards

### What's Next
🔲 **Additional UI Components**
- Input fields with validation
- Modal/Dialog components
- Form components
- Progress indicators

🔲 **State Management**
- Zustand store implementation
- Form state management
- Error handling patterns

🔲 **Routing**
- React Router setup
- Protected routes
- Navigation components

🔲 **API Integration**
- Service layer setup
- Error handling
- Loading states

## 🎯 Getting Started with Development

### 1. Start the Development Server
```bash
cd apps/web
npm run dev
```

### 2. View the Application
Open `http://localhost:3000` in your browser to see the hello world application with:
- Modern design system
- Interactive button components
- Responsive layout
- TypeScript support

### 3. Make Changes
- Edit `src/App.tsx` to modify the main page
- Add new components in `src/components/`
- Extend the design system in `src/index.css`
- Update utilities in `src/utils/helpers.ts`

### 4. Build for Production
```bash
npm run build
```

The built files will be in the `dist/` directory.

## 📚 Related Documentation

- [Design Specification](../docs/design_spec.md) - Complete design system and component specifications
- [Frontend Technical Specification](../docs/frontend_spec.md) - Detailed technical implementation guide
- [Main Project README](../README.md) - Overall project information

## 🔗 Integration with Backend

The frontend is configured to proxy API calls to the backend server:
- Development: `http://localhost:3001/api`
- Configured in `vite.config.ts` proxy settings

## 🧪 Testing Strategy

Tests will be implemented using:
- **Vitest** for unit testing
- **React Testing Library** for component testing
- **@testing-library/jest-dom** for additional matchers

Example test structure:
```tsx
// src/components/ui/Button/Button.test.tsx
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

test('renders button with correct text', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
});
```

---

**Built with ❤️ using modern web technologies**

For questions or issues, please refer to the main project documentation or create an issue in the project repository.
