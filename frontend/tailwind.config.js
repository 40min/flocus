/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // Scan all JS, JSX, TS, and TSX files in the src directory
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Original application colors (restored for existing components)
        primary: {
          DEFAULT: "#3B82F6", // A vibrant blue
          light: "#60A5FA",
          dark: "#2563EB",
        },
        accent: {
          DEFAULT: "#10B981", // A complementary green for success/break
          light: "#34D399",
          dark: "#059669",
        },
        background: {
          DEFAULT: 'var(--color-background-default)',
          card: 'var(--color-background-card)',
        },
        text: {
          DEFAULT: 'var(--color-text-default)',
          secondary: 'var(--color-text-secondary)',
          light: "#6B7280", // Even lighter for less prominent text
        },
        border: {
          DEFAULT: 'var(--color-border-default)',
          dark: "#D1D5DB", // Slightly darker for hover/focus borders
        },
        "heading-main": "#1A1A1A",
        "heading-sub": "#4A4A4A",

        // Shadcn/ui design tokens (with ui- prefix to avoid conflicts)
        "ui-border": "hsl(var(--border))",
        "ui-input": "hsl(var(--input))",
        "ui-ring": "hsl(var(--ring))",
        "ui-background": "hsl(var(--background))",
        "ui-foreground": "hsl(var(--foreground))",
        "ui-primary": {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        "ui-secondary": {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        "ui-destructive": {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        "ui-muted": {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        "ui-accent": {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        "ui-popover": {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        "ui-card": {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      backgroundImage: {
        'theme-background': 'var(--background-image-url)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        esteban: ["Esteban", "sans-serif"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
