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
        <nav className="bg-gray-800 p-4">
          <ul className="flex gap-4">
            <li><Link to="/" className="text-white hover:text-gray-300">Home</Link></li>
            <li><Link to="/about" className="text-white hover:text-gray-300">About</Link></li>
            {!isLoading && !isAuthenticated && <li><Link to="/login" className="text-white hover:text-gray-300">Login</Link></li>}
            {!isLoading && !isAuthenticated && <li><Link to="/register" className="text-white hover:text-gray-300">Register</Link></li>}
            {!isLoading && isAuthenticated && <li><button onClick={logout} className="text-white hover:text-gray-300">Logout</button></li>}
          </ul>
        </nav>
        <main className="flex-grow flex flex-col">
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
