# Shadcn/ui Components

This directory contains Shadcn/ui components that provide a consistent, accessible, and customizable UI component library for the Flocus application.

## Setup Complete ✅

The Shadcn/ui component system has been successfully installed and configured with:

- **CSS Variables**: Design tokens configured in `src/styles/index.css`
- **Tailwind Integration**: Updated `tailwind.config.js` with component variants
- **TypeScript Support**: Path aliases configured in `tsconfig.json`
- **Component Generation**: CLI configured via `components.json`

## Available Components

### Core Components

- **Button** (`button.tsx`) - Versatile button component with multiple variants and sizes
- **Input** (`input.tsx`) - Form input component with consistent styling
- **Dialog** (`dialog.tsx`) - Modal dialog component built on Radix UI primitives

### Usage Example

```typescript
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

function MyComponent() {
  return (
    <div>
      <Button variant="default" size="lg">
        Click me
      </Button>

      <Input placeholder="Enter text..." />

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <p>Dialog content here</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

## Adding New Components

To add new Shadcn/ui components:

```bash
npx shadcn@latest add [component-name]
```

Example:

```bash
npx shadcn@latest add select
npx shadcn@latest add form
npx shadcn@latest add dropdown-menu
```

## Customization

Components can be customized by:

1. **CSS Variables**: Modify design tokens in `src/styles/index.css`
2. **Tailwind Config**: Update variants in `tailwind.config.js`
3. **Component Props**: Use className prop to override styles
4. **Variant System**: Extend component variants using class-variance-authority

## Color System

The application now supports two color systems:

- **Original colors**: `primary`, `accent`, `background`, `text`, `border` (for existing components)
- **Shadcn/ui colors**: `ui-primary`, `ui-accent`, `ui-background`, etc. (for new UI components)

This dual system ensures backward compatibility while providing modern design tokens for new components.

## Migration Strategy

See `component-mapping.md` for the complete migration strategy from existing custom components to Shadcn/ui components.

## Dependencies

- `@radix-ui/react-*` - Accessible component primitives
- `class-variance-authority` - Component variant system
- `tailwindcss-animate` - Animation utilities
- `lucide-react` - Icon library (already installed)

## Resources

- [Shadcn/ui Documentation](https://ui.shadcn.com/)
- [Radix UI Documentation](https://www.radix-ui.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
