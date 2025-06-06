import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import './styles/index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ErrorProvider, useError } from './context/ErrorContext';
import ErrorMessageBalloon from './components/ErrorMessageBalloon';

const RootApp: React.FC = () => {
  const { errorMessage, clearError } = useError();
  return (
    <>
      <App />
      <ErrorMessageBalloon message={errorMessage} onClose={clearError} />
    </>
  );
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <Router>
      <AuthProvider>
        <ErrorProvider>
          <RootApp />
        </ErrorProvider>
      </AuthProvider>
    </Router>
  </React.StrictMode>
);
