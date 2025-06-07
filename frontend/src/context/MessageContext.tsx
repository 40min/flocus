import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

type MessageType = 'success' | 'error';

interface MessageState {
  text: string;
  type: MessageType;
}

interface MessageContextType {
  message: MessageState | null;
  showMessage: (text: string, type: MessageType) => void;
  clearMessage: () => void;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export const MessageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [message, setMessage] = useState<MessageState | null>(null);

  const showMessage = useCallback((text: string, type: MessageType) => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage(null);
    }, 5000); // Message disappears after 5 seconds
  }, []);

  const clearMessage = useCallback(() => {
    setMessage(null);
  }, []);

  return (
    <MessageContext.Provider value={{ message, showMessage, clearMessage }}>
      {children}
    </MessageContext.Provider>
  );
};

export const useMessage = () => {
  const context = useContext(MessageContext);
  if (context === undefined) {
    throw new Error('useMessage must be used within an MessageProvider');
  }
  return context;
};
