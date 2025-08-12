import React, { useEffect, useState } from "react";
import { initializeAuth } from "../stores/authStore";

interface AuthInitializerProps {
  children: React.ReactNode;
}

/**
 * Component that initializes the auth store on app startup
 * Replaces the AuthProvider context pattern
 */
export const AuthInitializer: React.FC<AuthInitializerProps> = ({
  children,
}) => {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      await initializeAuth();
      setIsInitialized(true);
    };

    initialize();
  }, []);

  // Show loading state while initializing auth
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-DEFAULT">
        <p className="text-slate-700">Initializing application...</p>
      </div>
    );
  }

  return <>{children}</>;
};
