import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface ErrorContextType {
  errorMessage: string | null;
  showError: (message: string) => void;
  clearError: () => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const ErrorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showError = useCallback((message: string) => {
    setErrorMessage(message);
    setTimeout(() => {
      setErrorMessage(null);
    }, 5000); // Message disappears after 5 seconds
  }, []);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  return (
    <ErrorContext.Provider value={{ errorMessage, showError, clearError }}>
      {children}
    </ErrorContext.Provider>
  );
};

export const useError = () => {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};
