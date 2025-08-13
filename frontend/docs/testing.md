# Testing Strategy

## Overview

This document outlines the testing strategy for the Flocus frontend application, ensuring consistency and quality across all components and features.

## Testing Pyramid

### Unit Tests

- **Purpose**: Test individual, isolated functions or small modules
- **Targets**: Utility functions (`src/utils/`), service functions (`src/services/`)
- **Tools**: Jest
- **Approach**: Mock all external dependencies to ensure true isolation

### Integration Tests

- **Purpose**: Test the interaction between multiple units or components
- **Targets**: React components (`src/components`, `src/pages`), custom hooks (`src/hooks`)
- **Tools**: React Testing Library, Jest
- **Approach**: Render components and interact with them as a user would. Mock API calls and service layer interactions

### End-to-End Tests

- **Purpose**: Simulate real user scenarios across the entire application
- **Targets**: Critical user flows (login, task creation, daily plan management)
- **Tools**: Future consideration (Cypress, Playwright)
- **Approach**: Test the application as a black box, interacting with the UI and verifying outcomes

## Testing Targets

### Services (`src/services`)

- All public functions within service files should have comprehensive unit tests
- Focus on business logic and data manipulation
- Mock HTTP requests and external dependencies

### Hooks (`src/hooks`)

- Custom hooks with complex logic or state management should be tested using React Testing Library's `renderHook` utility
- Test state changes and side effects
- Mock external dependencies and API calls

### Components (`src/components`, `src/pages`)

- Critical and complex components should have integration tests
- Tests should cover user interactions, state changes, and rendering of props
- Aim for high coverage of user-facing functionality
- Test accessibility features and keyboard navigation

## Testing Utilities

### Test Setup

```typescript
// Enhanced testing utilities
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

export const renderWithProviders = (
  ui: React.ReactElement,
  options: RenderOptions = {}
) => {
  const queryClient = createTestQueryClient();

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
};
```

### Common Test Patterns

#### Component Testing

```typescript
import { renderWithProviders } from "../test-utils";
import { screen, fireEvent, waitFor } from "@testing-library/react";

test("should handle user interaction", async () => {
  renderWithProviders(<MyComponent />);

  const button = screen.getByRole("button", { name: /click me/i });
  fireEvent.click(button);

  await waitFor(() => {
    expect(screen.getByText("Success")).toBeInTheDocument();
  });
});
```

#### Hook Testing

```typescript
import { renderHook, act } from "@testing-library/react";
import { useMyHook } from "../hooks/useMyHook";

test("should update state correctly", () => {
  const { result } = renderHook(() => useMyHook());

  act(() => {
    result.current.updateValue("new value");
  });

  expect(result.current.value).toBe("new value");
});
```

## Test Organization

### File Structure

- Test files should be co-located with the code they test
- Use `.test.tsx` or `.test.ts` extensions
- Group related tests using `describe` blocks
- Use descriptive test names that explain the expected behavior

### Naming Conventions

- Test files: `ComponentName.test.tsx`
- Test descriptions: "should [expected behavior] when [condition]"
- Mock files: `__mocks__/moduleName.ts`

## Mocking Strategies

### API Mocking

- Mock service functions rather than HTTP requests
- Use Jest mocks for consistent behavior
- Provide realistic mock data

### Component Mocking

- Mock complex child components when testing parent components
- Use shallow rendering for unit tests
- Mock external libraries that don't affect the test logic

## Coverage Goals

- **Unit Tests**: 90%+ coverage for utility functions and services
- **Integration Tests**: 80%+ coverage for components and hooks
- **Critical Paths**: 100% coverage for authentication, data persistence, and core user flows

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- ComponentName.test.tsx
```

## Best Practices

### Writing Tests

1. Follow the Arrange-Act-Assert pattern
2. Test behavior, not implementation details
3. Use semantic queries (getByRole, getByLabelText)
4. Write tests that would fail if the feature breaks
5. Keep tests simple and focused

### Maintenance

1. Update tests when requirements change
2. Remove obsolete tests when features are removed
3. Refactor tests when code structure changes
4. Keep test utilities up to date

### Performance

1. Use `screen` queries instead of destructuring render result
2. Avoid unnecessary `waitFor` calls
3. Mock expensive operations
4. Clean up after tests to prevent memory leaks

## Continuous Integration

- Tests run automatically on every pull request
- Coverage reports are generated and tracked
- Failed tests block deployment
- Performance regression tests for critical components
