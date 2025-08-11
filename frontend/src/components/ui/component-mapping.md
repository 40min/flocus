# Component Mapping Strategy

This document outlines the mapping strategy from existing custom components to Shadcn/ui components.

## Component Migration Plan

### Phase 1: Core UI Components

| Existing Component | Shadcn/ui Component | Status   | Notes                    |
| ------------------ | ------------------- | -------- | ------------------------ |
| `Button.tsx`       | `ui/button.tsx`     | ✅ Ready | Generated and configured |
| `Input.tsx`        | `ui/input.tsx`      | ✅ Ready | Generated and configured |
| `Modal.tsx`        | `ui/dialog.tsx`     | ✅ Ready | Generated and configured |

### Phase 2: Form Components

| Existing Component      | Shadcn/ui Component | Status     | Notes                       |
| ----------------------- | ------------------- | ---------- | --------------------------- |
| Form elements in modals | `ui/form.tsx`       | 🔄 Pending | React Hook Form integration |
| Select components       | `ui/select.tsx`     | 🔄 Pending | Radix Select primitive      |

### Phase 3: Complex Components

| Existing Component | Shadcn/ui Component    | Status     | Notes              |
| ------------------ | ---------------------- | ---------- | ------------------ |
| Custom dropdowns   | `ui/dropdown-menu.tsx` | 🔄 Pending | Radix DropdownMenu |
| Tooltips           | `ui/tooltip.tsx`       | 🔄 Pending | Radix Tooltip      |

## Migration Guidelines

### 1. Backward Compatibility

- Keep existing components during migration
- Use feature flags or gradual rollout
- Maintain existing prop interfaces where possible

### 2. Styling Consistency

- Use CSS variables for theming
- Maintain existing color scheme through CSS variable mapping
- Preserve accessibility features

### 3. Testing Strategy

- Test each component in isolation
- Verify accessibility compliance
- Check visual consistency across the application

## Import Strategy

### Before Migration

```typescript
import { Button } from "@/components/ui/button";
```

### After Migration

```typescript
import { Button } from "@/components/ui/button";
```

### Transition Period (Aliasing)

```typescript
// In components/index.ts
export { Button } from "./ui/button";
export { Button as LegacyButton } from "./Button";
```

## CSS Variable Mapping

The Tailwind configuration has been updated to include both Shadcn/ui design tokens and original application colors:

- **Original colors** (preserved): `primary`, `secondary`, `accent`, `background`, `text`, `border`
- **Shadcn/ui colors** (prefixed): `ui-primary`, `ui-secondary`, `ui-accent`, `ui-background`, `ui-foreground`, `ui-border`

This approach ensures:

- Existing components continue to work without changes
- New Shadcn/ui components use their own design system
- No conflicts between color systems
- Gradual migration is possible
