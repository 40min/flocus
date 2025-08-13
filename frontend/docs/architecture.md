# Frontend Architecture

## Overview

The Flocus frontend is built with React 19 and TypeScript, following modern React patterns and best practices. The architecture emphasizes maintainability, performance, and developer experience.

## Technology Stack

### Core Technologies

- **React 19** - UI library with latest features
- **TypeScript** - Type safety and developer experience
- **Tailwind CSS** - Utility-first styling
- **React Router** - Client-side routing

### State Management

- **Zustand** - Global state management for complex state
- **React Query** - Server state management and caching
- **React Context** - Simple state sharing

### UI Components

- **Radix UI** - Accessible component primitives
- **Shadcn/ui** - Pre-built component system
- **Lucide React** - Icon library

### Utilities

- **Day.js** - Date/time manipulation
- **Lodash-ES** - Utility functions (tree-shakeable)
- **Zod** - Schema validation
- **React Hook Form** - Form management

### Development Tools

- **React Query DevTools** - Server state debugging
- **Webpack Bundle Analyzer** - Bundle size monitoring
- **Auto-animate** - Layout animations

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Shadcn/ui components
│   ├── modals/         # Modal components
│   └── layout/         # Layout components
├── pages/              # Route components
├── hooks/              # Custom React hooks
├── services/           # API service layer
├── stores/             # Zustand stores
├── context/            # React contexts
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── constants/          # Application constants
└── styles/             # Global styles
```

## Design Patterns

### Component Composition

- Use composition over inheritance
- Leverage Radix UI primitives for accessibility
- Implement compound components for complex UI

### State Management Strategy

- **Local state**: useState for component-specific state
- **Shared state**: Zustand stores for complex global state
- **Server state**: React Query for API data
- **Form state**: React Hook Form for form management

### Error Handling

- Error boundaries for component-level errors
- Centralized error handling in services
- User-friendly error messages and fallbacks

### Performance Optimization

- Code splitting with React.lazy
- Memoization with React.memo and useMemo
- Selective subscriptions in Zustand stores
- Tree-shaking with ES modules

## Data Flow

```
User Interaction → Component → Hook/Store → Service → API
                                    ↓
User Interface ← Component ← Hook/Store ← Service ← Response
```

### API Integration

1. Services handle API communication
2. React Query manages caching and synchronization
3. Hooks provide data to components
4. Components render UI based on data state

### State Updates

1. User actions trigger state updates
2. Zustand stores manage global state changes
3. React Query handles server state synchronization
4. Components re-render based on subscribed state

## Security Considerations

- JWT token management in secure storage
- Input validation with Zod schemas
- XSS prevention through React's built-in protections
- CSRF protection through API design

## Accessibility

- Semantic HTML structure
- ARIA attributes through Radix UI
- Keyboard navigation support
- Screen reader compatibility
- Color contrast compliance

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES2020+ features
- CSS Grid and Flexbox
- Web APIs (localStorage, fetch, etc.)
