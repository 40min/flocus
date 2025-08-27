import React, { useEffect, ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import { useUpdateTask } from "../hooks/useTasks";
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
  const { mutateAsync: updateTaskMutation } = useUpdateTask();
  const setUserPreferences = useTimerStore((state) => state.setUserPreferences);
  const setUpdateTaskMutation = useTimerStore(
    (state) => state.setUpdateTaskMutation
  );
  const clearTimerState = useTimerStore((state) => state.clearTimerState);

  // Initialize timer when user is authenticated
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      if (mounted && user) {
        // Set the mutation function in the timer store
        setUpdateTaskMutation(updateTaskMutation);
        await initializeTimer();
      }
    };

    if (user) {
      initialize();
    } else {
      // Stop timer and clear state if user is not authenticated
      stopTimerInterval();
      clearTimerState();
    }

    // Cleanup on unmount
    return () => {
      mounted = false;
      stopTimerInterval();
    };
  }, [user, clearTimerState, updateTaskMutation, setUpdateTaskMutation]);

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
