# Zustand Auth Store

This directory contains the Zustand-based state management implementation for authentication state.

## Overview

The authentication state management uses Zustand for better performance and developer experience, replacing the previous React Context pattern.

### Files

- `authStore.ts` - Main Zustand store for authentication state
- `authStore.test.ts` - Unit tests for the auth store
- `../hooks/useAuth.ts` - Auth hook that uses the Zustand store
- `../hooks/useAuth.test.tsx` - Tests for auth hook
- `../components/AuthInitializer.tsx` - Component that initializes the auth store
- `README.md` - This documentation

### Features

- **Persistence**: Authentication token is persisted to localStorage
- **DevTools**: Zustand DevTools integration for debugging
- **Navigation**: Automatic navigation to login page on logout
- **Error Handling**: Proper error handling for failed authentication
- **Loading States**: Loading state management during authentication operations

### Usage

Use the `useAuth` hook to access authentication state and actions:

```typescript
const { user, token, isAuthenticated, isLoading, login, logout } = useAuth();
```

### Store Structure

```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  fetchUserData: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setNavigate: (navigate: (path: string) => void) => void;
}
```

### Benefits

1. **Performance**: Selective subscriptions prevent unnecessary re-renders
2. **DevTools**: Better debugging capabilities with Zustand DevTools
3. **Persistence**: Built-in persistence middleware
4. **Type Safety**: Full TypeScript support
5. **Testing**: Easier to test with direct store access
6. **Bundle Size**: Minimal impact (+2.77 kB)

### Implementation Status

- ✅ Auth store implementation
- ✅ Persistence middleware
- ✅ DevTools integration
- ✅ Navigation handling
- ✅ Component updates
- ✅ Test coverage
- ✅ All tests passing (496/496)
