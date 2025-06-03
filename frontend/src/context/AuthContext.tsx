import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../services/userService';
import { User } from '../types/user';

export interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    navigate('/login');
  }, [navigate, setToken, setUser, setIsAuthenticated]);

  // Fetch user data using the token
  const fetchUserData = useCallback(async (authToken: string) => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      // If we can't fetch user data, clear the authentication
      logout();
    }
  }, [logout, setUser, setIsAuthenticated]); // Added getCurrentUser if it's not stable, but it's an import.

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('access_token');
      if (storedToken) {
        setToken(storedToken);
        await fetchUserData(storedToken);
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, [fetchUserData, setToken]); // Added fetchUserData and setToken

  useEffect(() => {
    const handleLogoutEvent = () => {
      logout();
    };

    window.addEventListener('triggerLogout', handleLogoutEvent);

    return () => {
      window.removeEventListener('triggerLogout', handleLogoutEvent);
    };
  }, [logout]);

  const login = async (newToken: string) => {
    setIsLoading(true); // Set loading true
    try {
      localStorage.setItem('access_token', newToken);
      setToken(newToken);
      await fetchUserData(newToken);
    } catch (error) {
      console.error('Error during login execution:', error);
      // Depending on how fetchUserData handles errors (e.g., if it re-throws or calls logout),
      // additional error handling here might be needed or could be minimal.
    } finally {
      setIsLoading(false); // Ensure loading is set to false
    }
  };

  // const logout = () => { // This is now defined above with useCallback
  //   localStorage.removeItem('access_token');
  //   setToken(null);
  //   setUser(null);
  //   setIsAuthenticated(false);
  //   navigate('/login');
  // };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
