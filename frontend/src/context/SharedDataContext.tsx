import React, { createContext, useState, useContext } from 'react';

interface SharedDataContextProps {
  // Currently no shared data, can be extended later
}

const SharedDataContext = createContext<SharedDataContextProps | undefined>(undefined);

export const SharedDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // No state needed for now as there's no shared data

  return (
    <SharedDataContext.Provider value={{}}>
      {children}
    </SharedDataContext.Provider>
  );
};

export const useSharedDataContext = () => {
  const context = useContext(SharedDataContext);
  if (!context) {
    throw new Error('useSharedDataContext must be used within a SharedDataProvider');
  }
  return context;
};
