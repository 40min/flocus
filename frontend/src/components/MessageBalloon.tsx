import React from 'react';
import { useMessage } from '../context/MessageContext';

const MessageBalloon: React.FC = () => {
  const { message, clearMessage } = useMessage();

  if (!message) {
    return null;
  }

  const bgColorClass = message.type === 'success' ? 'bg-green-500' : 'bg-red-500';

  return (
    <div className={`fixed top-4 right-4 ${bgColorClass} text-white px-6 py-3 rounded-lg shadow-lg flex items-center justify-between z-50 animate-slide-down`}>
      <span>{message.text}</span>
      <button onClick={clearMessage} className="ml-4 text-white font-bold">
        &times;
      </button>
    </div>
  );
};

export default MessageBalloon;
