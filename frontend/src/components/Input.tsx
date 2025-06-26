import React, { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';
import { cn } from '../lib/utils';

type CommonInputProps = {
  className?: string;
};

type InputElementProps = CommonInputProps & InputHTMLAttributes<HTMLInputElement> & { as?: 'input' };
type TextareaElementProps = CommonInputProps & TextareaHTMLAttributes<HTMLTextAreaElement> & { as: 'textarea' };
type SelectElementProps = CommonInputProps & SelectHTMLAttributes<HTMLSelectElement> & { as: 'select' };

type InputProps = InputElementProps | TextareaElementProps | SelectElementProps;

const Input = React.forwardRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, InputProps>(
  ({ className, as = 'input', ...props }, ref) => {
    const baseStyles = "block w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 placeholder-gray-400 py-2.5 px-3.5 text-sm";

    let Component: React.ElementType;
    let mergedProps: any;

    if (as === 'textarea') {
      Component = 'textarea';
      mergedProps = props as TextareaHTMLAttributes<HTMLTextAreaElement>;
    } else if (as === 'select') {
      Component = 'select';
      mergedProps = props as SelectHTMLAttributes<HTMLSelectElement>;
    } else {
      Component = 'input';
      mergedProps = props as InputHTMLAttributes<HTMLInputElement>;
    }

    return (
      <Component
        className={cn(baseStyles, className)}
        ref={ref}
        {...mergedProps}
      />
    );
  }
);

export default Input;
