import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
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

// Set or remove the Authorization header on the api instance when the token changes
  useEffect(() => {
    if (token) {
      if (api.defaults && api.defaults.headers && api.defaults.headers.common) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } else {
        // It's good practice to ensure the structure exists.
        // If api.defaults or api.defaults.headers doesn't exist, initialize them.
        if (!api.defaults) {
          // @ts-expect-error - AxiosStatic does not have a direct 'defaults' type in some setups
          api.defaults = {};
        }
        if (!api.defaults.headers) {
          // @ts-expect-error - AxiosDefaults does not have a direct 'headers' type in some setups
          api.defaults.headers = {};
        }
        if (!api.defaults.headers.common) {
          api.defaults.headers.common = {};
        }
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.warn("api.defaults.headers.common was not found, initialized and set Authorization header.");
      }
    } else {
      if (api.defaults && api.defaults.headers && api.defaults.headers.common && api.defaults.headers.common['Authorization']) {
        delete api.defaults.headers.common['Authorization'];
      } else {
        // If the header or its path doesn't exist, no need to delete, but log if it's unexpected.
        if (!(api.defaults && api.defaults.headers && api.defaults.headers.common)) {
          console.warn("api.defaults.headers.common not found. Could not delete Authorization header.");
        }
        // If api.defaults.headers.common exists but Authorization does not, it's already "deleted".
      }
    }
  }, [token]); // Re-run effect when token changes
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

  const logout = () => {
    localStorage.removeItem('access_token');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    navigate('/login');
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
