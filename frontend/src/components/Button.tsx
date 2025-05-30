import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({ children, onClick, className }) => {
  return (
    <button
      className={`bg-gray-700 hover:bg-gray-900 text-white font-bold py-2 px-4 rounded-sm md:py-3 md:px-6 lg:text-lg ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default Button;
