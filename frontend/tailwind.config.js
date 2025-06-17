/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // Scan all JS, JSX, TS, and TSX files in the src directory
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3B82F6', // A vibrant blue
          light: '#60A5FA',
          dark: '#2563EB',
        },
        accent: {
          DEFAULT: '#10B981', // A complementary green for success/break
          light: '#34D399',
          dark: '#059669',
        },
        background: {
          DEFAULT: '#E6F5E6', // A more noticeable light green for main page background
          card: '#F0FFF0', // A slightly lighter, but still more noticeable green for component cards
        },
        text: {
          DEFAULT: '#1F2937', // Dark gray for main text
          secondary: '#4B5563', // Slightly lighter gray for secondary text
          light: '#6B7280', // Even lighter for less prominent text
        },
        border: {
          DEFAULT: '#E5E7EB', // Light gray for borders
          dark: '#D1D5DB', // Slightly darker for hover/focus borders
        },
        'heading-main': '#1A1A1A',
        'heading-sub': '#4A4A4A',
      },
      fontFamily: {
        esteban: ['Esteban', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
