import React, { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

const Input: React.FC<InputProps> = ({ className, ...props }) => {
  const baseStyles = "appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm rounded-xl bg-gray-100 border border-gray-200 py-3 px-4 text-gray-800 focus:outline-none focus:border-indigo-300 focus:shadow-[0_0_0_3px_rgba(165,180,252,0.25)]";

  return (
    <input
      className={`${baseStyles} ${className || ''}`}
      {...props}
    />
  );
};

export default Input;
