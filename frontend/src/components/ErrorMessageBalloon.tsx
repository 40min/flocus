import React from 'react';

interface ErrorMessageBalloonProps {
  message: string | null;
  onClose: () => void;
}

const ErrorMessageBalloon: React.FC<ErrorMessageBalloonProps> = ({ message, onClose }) => {
  if (!message) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center justify-between z-50 animate-slide-down">
      <span>{message}</span>
      <button onClick={onClose} className="ml-4 text-white font-bold">
        &times;
      </button>
    </div>
  );
};

export default ErrorMessageBalloon;
