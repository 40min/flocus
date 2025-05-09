import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import api from '../services/api';
import { getCurrentUser } from '../services/userService';
import { User } from '../types/user';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch user data using the token
  const fetchUserData = async (authToken: string) => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      // If we can't fetch user data, clear the authentication
      logout();
    }
  };

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
  }, []);

  const login = async (newToken: string) => {
    localStorage.setItem('access_token', newToken);
    setToken(newToken);
    await fetchUserData(newToken);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = '/login';
  };

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
