import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ErrorProvider } from './context/ErrorContext';
import App from './App';

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorProvider>
          {children}
        </ErrorProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

test('renders without crashing', () => {
  render(
    <TestWrapper>
      <App />
    </TestWrapper>
  );
});
