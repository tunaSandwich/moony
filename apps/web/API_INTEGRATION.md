# Moony Frontend API Integration

## Overview

Simple, clean API connection layer for the React frontend that provides easy access to all Moony backend endpoints with built-in JWT authentication, error handling, and TypeScript support.

## Quick Start

```tsx
import { authApi, twilioApi } from '@/api';

// Example: Validate invite code
try {
  const response = await authApi.validateInviteCode(code, phone);
  setUser(response.user);
  setToken(response.token); // Token stored automatically
} catch (error) {
  setError(error.message); // User-friendly message
}
```

## API Services

### Authentication (`authApi`)

```tsx
// Validate invite code and login user
const response = await authApi.validateInviteCode(code: string, phoneNumber: string);
// Returns: { user: User, token: string }

// Connect Plaid bank account
const response = await authApi.connectPlaidAccount(publicToken: string);
// Returns: { message: string, hasConnectedBank: boolean }
```

### SMS Verification (`twilioApi`)

```tsx
// Send verification code (requires JWT token)
const response = await twilioApi.sendVerificationCode();
// Returns: { message: string }

// Verify phone number (requires JWT token)
const response = await twilioApi.verifyPhoneNumber(code: string);
// Returns: { message: string, twilioStatus: 'verified' }
```

## Features

### ✅ **Automatic JWT Token Management**
- Tokens stored in localStorage (30-day expiration)
- Automatic attachment to authenticated requests
- Auto-logout on 401 responses

### ✅ **User-Friendly Error Messages**
- Backend errors mapped to readable messages
- Network error handling
- Graceful timeout handling

### ✅ **TypeScript Support**
- Full type safety for all API calls
- IntelliSense support in editors
- Type-checked request/response contracts

### ✅ **Simple & Clean**
- No complex caching or retry logic
- Easy to understand and modify
- Minimal dependencies (only axios)

## File Structure

```
src/api/
├── index.ts        # Main exports
├── types.ts        # TypeScript definitions
├── client.ts       # Axios instance with auth
├── auth.ts         # Authentication endpoints
└── twilio.ts       # SMS verification endpoints
```

## Error Handling

The API automatically maps backend errors to user-friendly messages:

| Backend Error | User-Friendly Message |
|---------------|----------------------|
| "Invalid invite code or phone number" | "Please check your invite code and phone number" |
| "Unable to send verification code" | "Couldn't send SMS. Please try again" |
| "Invalid verification code" | "That code didn't work. Please try again" |
| "Verification code has expired" | "Your code expired. Request a new one" |

## Environment Variables

```env
VITE_API_URL=http://localhost:3000
```

## Testing

Visit `/api-test` to test all API endpoints with a visual interface.

## Usage Examples

See `/src/examples/api-usage.tsx` for complete component examples.

## Success Criteria ✅

- [x] All 4 API endpoints working with proper types
- [x] JWT auth working for protected endpoints  
- [x] Clear error messages shown to users
- [x] Easy to use from React components
- [x] Code is simple and easy to understand
