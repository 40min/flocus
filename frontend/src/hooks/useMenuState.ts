import { useState, useEffect, useCallback } from 'react';

const LOCAL_STORAGE_KEY = 'menuOpen';

export const useMenuState = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(() => {
    // Initialize state from localStorage, defaulting to true
    try {
      const item = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      return item ? JSON.parse(item) : true;
    } catch (error) {
      console.warn('Error reading from localStorage', error);
      return true;
    }
  });

  useEffect(() => {
    // Persist state to localStorage
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(isMenuOpen));
    } catch (error) {
      console.error('Error writing to localStorage', error);
    }
  }, [isMenuOpen]);

  const toggleMenu = useCallback(() => {
    setIsMenuOpen((prev: boolean) => !prev);
  }, []);

  return { isMenuOpen, toggleMenu };
};
