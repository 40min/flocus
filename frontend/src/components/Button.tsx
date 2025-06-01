import React from 'react';
import { cn } from '../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  // onClick, className, type, disabled are inherited from React.ButtonHTMLAttributes
}

const Button: React.FC<ButtonProps> = ({ children, className, ...props }) => {
  return (
    <button
      className={cn(
        'btn-standard', // Base styles, ensure this class is defined in your CSS
        // Example additional base styles (Tailwind CSS)
        'py-2 px-4 rounded font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2',
        // Example disabled state styles (Tailwind CSS)
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className // Allows additional classes to be passed for specific instances
      )}
      {...props} // Spreads other props like onClick, type, disabled, etc.
    >
      {children}
    </button>
  );
};

export default Button;
