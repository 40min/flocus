# Component Library

## Overview

The Flocus frontend uses a modern component system built on Radix UI primitives and Shadcn/ui components, providing accessibility, consistency, and maintainability.

## Component System Architecture

### Foundation

- **Radix UI**: Accessible, unstyled component primitives
- **Shadcn/ui**: Pre-styled components with Tailwind CSS
- **Tailwind CSS**: Utility-first styling system
- **Class Variance Authority**: Type-safe variant handling

### Component Hierarchy

```
Application Components (pages/, components/)
    ↓
Custom Components (components/)
    ↓
Shadcn/ui Components (components/ui/)
    ↓
Radix UI Primitives
    ↓
HTML Elements
```

## Core UI Components

### Button (`components/ui/button.tsx`)

Versatile button component with multiple variants and sizes.

**Variants**:

- `default` - Primary action button
- `destructive` - Dangerous actions (delete, remove)
- `outline` - Secondary actions
- `secondary` - Alternative styling
- `ghost` - Minimal styling
- `link` - Link-styled button

**Sizes**:

- `default` - Standard size (h-10)
- `sm` - Small size (h-9)
- `lg` - Large size (h-11)
- `icon` - Square icon button (h-10 w-10)

**Usage**:

```tsx
import { Button } from "@/components/ui/button";

<Button variant="default" size="lg">
  Primary Action
</Button>

<Button variant="destructive" size="sm">
  Delete
</Button>
```

### Input (`components/ui/input.tsx`)

Form input component with consistent styling and validation support.

**Features**:

- Built-in validation styling
- Accessibility attributes
- Consistent focus states
- Error state handling

**Usage**:

```tsx
import { Input } from "@/components/ui/input";

<Input type="email" placeholder="Enter your email" required />;
```

### Dialog (`components/ui/dialog.tsx`)

Modal dialog component built on Radix UI Dialog primitive.

**Features**:

- Accessible modal behavior
- Focus management
- Escape key handling
- Backdrop click to close

**Usage**:

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
    </DialogHeader>
    <p>Dialog content goes here.</p>
  </DialogContent>
</Dialog>;
```

## Application Components

### Modal (`components/modals/Modal.tsx`)

Wrapper component that provides consistent modal behavior across the application.

**Features**:

- Auto-animate integration for smooth transitions
- Consistent styling and behavior
- Accessibility compliance
- Easy-to-use API

### Timeline (`components/Timeline.tsx`)

Displays time windows and tasks in a timeline format.

**Features**:

- Auto-animate for smooth transitions
- Drag and drop support
- Responsive design
- Time-based positioning

### Task Components

- `TaskItem` - Individual task display
- `TaskPicker` - Task selection interface
- `CurrentTasks` - Active task management
- `AssignedTaskBalloon` - Task assignment display

## Component Patterns

### Composition Pattern

Components are designed to be composable and flexible:

```tsx
// Good: Composable design
<Dialog>
  <DialogTrigger asChild>
    <Button variant="outline">Edit</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Task</DialogTitle>
    </DialogHeader>
    <TaskForm onSubmit={handleSubmit} />
  </DialogContent>
</Dialog>
```

### Compound Components

Complex components use the compound component pattern:

```tsx
// TimeWindow compound component
<TimeWindow>
  <TimeWindow.Header>
    <TimeWindow.Title>Morning Focus</TimeWindow.Title>
    <TimeWindow.Actions>
      <Button size="sm">Edit</Button>
    </TimeWindow.Actions>
  </TimeWindow.Header>
  <TimeWindow.Content>
    <TaskList tasks={tasks} />
  </TimeWindow.Content>
</TimeWindow>
```

### Render Props Pattern

For flexible component behavior:

```tsx
<DataProvider>
  {({ data, loading, error }) => (
    <div>
      {loading && <Spinner />}
      {error && <ErrorMessage error={error} />}
      {data && <DataDisplay data={data} />}
    </div>
  )}
</DataProvider>
```

## Styling Guidelines

### Tailwind CSS Classes

- Use semantic class names when possible
- Leverage Tailwind's design system
- Use consistent spacing scale
- Follow responsive design patterns

### Component Variants

Use Class Variance Authority for type-safe variants:

```tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        destructive: "bg-destructive text-destructive-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

## Accessibility

### ARIA Attributes

- All interactive elements have proper ARIA labels
- Form inputs have associated labels
- Complex components use ARIA relationships

### Keyboard Navigation

- All interactive elements are keyboard accessible
- Logical tab order throughout the application
- Escape key handling for modals and dropdowns

### Screen Reader Support

- Semantic HTML structure
- Descriptive text for screen readers
- Proper heading hierarchy

## Animation

### Auto-animate Integration

Components use auto-animate for smooth layout transitions:

```tsx
import { useAutoAnimate } from "@formkit/auto-animate/react";

const AnimatedList = ({ items }) => {
  const [parent] = useAutoAnimate();

  return (
    <div ref={parent}>
      {items.map((item) => (
        <div key={item.id}>{item.content}</div>
      ))}
    </div>
  );
};
```

### Performance Considerations

- Animations are GPU-accelerated when possible
- Reduced motion preferences are respected
- Animations can be disabled for performance

## Testing Components

### Component Testing Strategy

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "./button";

test("renders button with correct variant", () => {
  render(<Button variant="destructive">Delete</Button>);

  const button = screen.getByRole("button", { name: /delete/i });
  expect(button).toHaveClass("bg-destructive");
});

test("handles click events", () => {
  const handleClick = jest.fn();
  render(<Button onClick={handleClick}>Click me</Button>);

  fireEvent.click(screen.getByRole("button"));
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

## Best Practices

### Component Development

1. Start with Shadcn/ui components when possible
2. Extend with custom functionality as needed
3. Maintain consistent API patterns
4. Document component props and usage

### Performance

1. Use React.memo for expensive components
2. Implement proper key props for lists
3. Avoid inline object/function creation in render
4. Use callback hooks for event handlers

### Maintenance

1. Keep components focused and single-purpose
2. Extract reusable logic into custom hooks
3. Use TypeScript for type safety
4. Write comprehensive tests for complex components
