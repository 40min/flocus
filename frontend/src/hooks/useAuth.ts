import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";

/**
 * Hook that provides authentication state and actions using Zustand
 */
export const useAuth = () => {
  const navigate = useNavigate();
  const {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
    setNavigate,
  } = useAuthStore();

  // Set the navigate function in the store when the hook is used
  useEffect(() => {
    setNavigate(navigate);
  }, [navigate, setNavigate]);

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
  };
};
