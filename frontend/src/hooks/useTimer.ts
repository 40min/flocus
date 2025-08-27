import { useMemo } from "react";
import {
  useTimerStore,
  useTimerMode,
  useTimerRemaining,
  useTimerActive,
  useTimerPomodoros,
  useTimerCurrentTask,
  useTimerColors,
  useTimerModeText,
  useTimerActions,
} from "../stores/timerStore";

/**
 * Hook that provides the same interface as the original SharedTimerContext
 * for backward compatibility while using the new Zustand store internally.
 */
export const useTimer = () => {
  const mode = useTimerMode();
  const timeRemaining = useTimerRemaining();
  const isActive = useTimerActive();
  const pomodorosCompleted = useTimerPomodoros();
  const currentTask = useTimerCurrentTask();
  const colors = useTimerColors();
  const modeText = useTimerModeText();
  const actions = useTimerActions();

  // Get setters for backward compatibility
  const setIsActive = useTimerStore((state) => state.setIsActive);
  const setCurrentTask = useTimerStore((state) => state.setCurrentTask);

  const setCurrentTaskId = useMemo(
    () => (id?: string) =>
      setCurrentTask(id, currentTask?.name, currentTask?.description),
    [setCurrentTask, currentTask?.name, currentTask?.description]
  );

  const setCurrentTaskName = useMemo(
    () => (name?: string) =>
      setCurrentTask(currentTask?.id, name, currentTask?.description),
    [setCurrentTask, currentTask?.id, currentTask?.description]
  );
  const setCurrentTaskDescription = useMemo(
    () => (description?: string) =>
      setCurrentTask(currentTask?.id, currentTask?.name, description),
    [setCurrentTask, currentTask?.id, currentTask?.name]
  );

  return useMemo(
    () => ({
      // Timer state
      mode,
      timeRemaining,
      isActive,
      pomodorosCompleted,

      // Current task
      currentTaskId: currentTask?.id,
      currentTaskName: currentTask?.name,
      currentTaskDescription: currentTask?.description,

      // Actions
      handleStartPause: actions?.startPause,
      handleReset: actions?.reset,
      handleSkip: actions?.skip,
      stopCurrentTask: actions?.stopCurrentTask,
      resetForNewTask: actions?.resetForNewTask,
      handleMarkAsDone: actions?.markTaskAsDone,
      formatTime: actions?.formatTime,

      // Removed optimistic update loading states as per simplification requirements

      // Setters for backward compatibility
      setIsActive,
      setCurrentTaskId,
      setCurrentTaskName,
      setCurrentTaskDescription,

      // UI properties
      isBreak: mode !== "work",
      timerColor: colors?.timerColor,
      buttonBgColor: colors?.buttonBgColor,
      buttonTextColor: colors?.buttonTextColor,
      modeText,
    }),
    [
      mode,
      timeRemaining,
      isActive,
      pomodorosCompleted,
      currentTask,
      colors,
      modeText,
      actions,
      setIsActive,
      setCurrentTaskId,
      setCurrentTaskName,
      setCurrentTaskDescription,
    ]
  );
};

/**
 * Hook for components that only need timer display information
 * This provides selective subscriptions to prevent unnecessary re-renders
 */
export const useTimerDisplay = () => {
  const mode = useTimerMode();
  const timeRemaining = useTimerRemaining();
  const isActive = useTimerActive();
  const colors = useTimerColors();
  const modeText = useTimerModeText();
  const formatTime = useTimerStore((state) => state.formatTime);

  return useMemo(
    () => ({
      mode,
      timeRemaining,
      isActive,
      isBreak: mode !== "work",
      timerColor: colors?.timerColor,
      buttonBgColor: colors?.buttonBgColor,
      buttonTextColor: colors?.buttonTextColor,
      modeText,
      formatTime,
      formattedTime: formatTime ? formatTime(timeRemaining) : "00:00",
    }),
    [mode, timeRemaining, isActive, colors, modeText, formatTime]
  );
};

/**
 * Hook for components that only need timer controls
 * This provides selective subscriptions to prevent unnecessary re-renders
 */
export const useTimerControls = () => {
  const isActive = useTimerActive();
  const actions = useTimerActions();

  return useMemo(
    () => ({
      isActive,
      startPause: actions?.startPause,
      reset: actions?.reset,
      skip: actions?.skip,
      stopCurrentTask: actions?.stopCurrentTask,
      resetForNewTask: actions?.resetForNewTask,
      // Removed optimistic update loading states
    }),
    [isActive, actions]
  );
};

/**
 * Hook for components that only need current task information
 * This provides selective subscriptions to prevent unnecessary re-renders
 */
export const useTimerTask = () => {
  const currentTask = useTimerCurrentTask();
  const actions = useTimerActions();

  return useMemo(
    () => ({
      currentTaskId: currentTask?.id,
      currentTaskName: currentTask?.name,
      currentTaskDescription: currentTask?.description,
      setCurrentTask: actions?.setCurrentTask,
      markTaskAsDone: actions?.markTaskAsDone,
    }),
    [currentTask, actions]
  );
};
