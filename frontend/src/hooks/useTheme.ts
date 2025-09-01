import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { updateUser } from '../services/userService';

export const useTheme = () => {
  const { user, theme, setTheme } = useAuthStore();

  useEffect(() => {
    const htmlElement = document.documentElement;
    // Remove all existing theme classes (any class starting with 'theme-')
    const themeClasses = Array.from(htmlElement.classList).filter(cls => cls.startsWith('theme-'));
    themeClasses.forEach(cls => htmlElement.classList.remove(cls));
    // Add current theme class
    htmlElement.classList.add(`theme-${theme}`);
  }, [theme]);

  const changeTheme = async (newTheme: string) => {
    if (!user) return;

    try {
      // Update local state immediately for instant UI feedback
      setTheme(newTheme);
      // Update backend
      await updateUser(user.id, { preferences: { theme: newTheme } });
    } catch (error) {
      console.error('Failed to update theme:', error);
      // Revert on error
      setTheme(theme);
    }
  };

  return {
    theme,
    setTheme: changeTheme,
  };
};
