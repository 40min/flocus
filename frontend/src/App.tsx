import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from 'react-router-dom';
import logo from './assets/logo.svg';
import './styles/App.css';
import Home from './pages/Home';
import About from './pages/About';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { useAuth } from './context/AuthContext';

// Simple component to protect routes
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>; // Or a spinner component
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

function App() {
  const { isAuthenticated, logout, isLoading } = useAuth();

  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <nav className="bg-gray-100 p-4">
          <ul className="flex space-x-4">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About</Link></li>
            {!isLoading && !isAuthenticated && <li><Link to="/login">Login</Link></li>}
            {!isLoading && !isAuthenticated && <li><Link to="/register">Register</Link></li>}
            {!isLoading && isAuthenticated && <li><button onClick={logout}>Logout</button></li>}
          </ul>
        </nav>
        <main className="flex-grow container mx-auto p-4">
          <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/about"
          element={
            <ProtectedRoute>
              <About />
            </ProtectedRoute>
          }
        />
        {/* Add other protected routes here */}
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
