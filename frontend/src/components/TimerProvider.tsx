import React, { useEffect, ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import {
  useTimerStore,
  initializeTimer,
  startTimerInterval,
  stopTimerInterval,
} from "../stores/timerStore";

interface TimerProviderProps {
  children: ReactNode;
}

/**
 * Provider component that initializes the timer store and manages the global timer interval.
 * This replaces the SharedTimerProvider but uses Zustand for state management.
 */
export const TimerProvider: React.FC<TimerProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const setUserPreferences = useTimerStore((state) => state.setUserPreferences);

  // Initialize timer on mount
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      if (mounted) {
        await initializeTimer();
      }
    };

    initialize();

    // Cleanup on unmount
    return () => {
      mounted = false;
      stopTimerInterval();
    };
  }, []);

  // Update user preferences when user changes
  useEffect(() => {
    if (user?.preferences) {
      setUserPreferences(user.preferences);
    }
  }, [user?.preferences, setUserPreferences]);

  // Handle page visibility changes to manage timer interval
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, we can keep the interval running but it's less critical
        // The timer state will be persisted and restored correctly
      } else {
        // Page is visible, ensure timer interval is running
        startTimerInterval();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Handle beforeunload to ensure state is persisted
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Zustand persist middleware will handle this automatically,
      // but we can add any additional cleanup here if needed
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  return <>{children}</>;
};
