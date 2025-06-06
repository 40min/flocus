import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback, useRef } from 'react';
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
  const fetchUserData = useCallback(async () => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  }, [logout, setUser, setIsAuthenticated, setIsLoading]);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('access_token');
      if (storedToken) {
        setToken(storedToken);
        await fetchUserData();
      } else {
        setIsLoading(false);
      }
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
      await fetchUserData();
    } catch (error) {
      console.error('Error during login execution:', error);
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
