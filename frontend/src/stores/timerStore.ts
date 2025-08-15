import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { devtools } from "zustand/middleware";
import { useMemo } from "react";
import { updateTask } from "../services/taskService";
import {
  getTodayStats,
  incrementPomodoro,
} from "../services/userDailyStatsService";
import * as notificationService from "../services/notificationService";
import { User } from "../types/user";

const CYCLES_BEFORE_LONG_BREAK = 4;
const LOCAL_STORAGE_KEY = "pomodoroTimerState";
const EXPIRATION_THRESHOLD = 60 * 60 * 1000; // 1 hour

type Mode = "work" | "shortBreak" | "longBreak";

interface TimerState {
  // Core timer state
  mode: Mode;
  timeRemaining: number;
  isActive: boolean;
  pomodorosCompleted: number;

  // Task-related state
  currentTaskId?: string;
  currentTaskName?: string;
  currentTaskDescription?: string;

  // Persistence
  timestamp: number;

  // User preferences (for duration calculations)
  userPreferences?: User["preferences"];

  // Actions
  setMode: (mode: Mode) => void;
  setTimeRemaining: (time: number) => void;
  setIsActive: (active: boolean) => void;
  setPomodorosCompleted: (count: number) => void;
  setCurrentTask: (
    taskId?: string,
    taskName?: string,
    taskDescription?: string
  ) => void;
  setUserPreferences: (preferences: User["preferences"]) => void;

  // Timer controls
  startPause: () => Promise<void>;
  reset: () => Promise<void>;
  skip: () => Promise<void>;
  stopCurrentTask: () => Promise<void>;
  resetForNewTask: () => Promise<void>;
  markTaskAsDone: (taskId: string) => Promise<void>;
  clearTimerState: () => void;

  // Utility functions
  formatTime: (seconds: number) => string;
  getDurationMap: () => Record<Mode, number>;
  getTimerColors: () => {
    timerColor: string;
    buttonBgColor: string;
    buttonTextColor: string;
  };
  getModeText: () => Record<Mode, string>;

  // Internal actions
  switchToNextMode: () => Promise<void>;
  initializeFromStats: () => Promise<void>;
  tick: () => void;
}

// Default state constants
const DEFAULT_TIMER_STATE = {
  mode: "work" as Mode,
  timeRemaining: 25 * 60, // Default to 25 minutes for work
  isActive: false,
  pomodorosCompleted: 0,
  currentTaskId: undefined,
  currentTaskName: undefined,
  currentTaskDescription: undefined,
  timestamp: Date.now(),
  userPreferences: undefined,
};

export const useTimerStore = create<TimerState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initialize with default state
        ...DEFAULT_TIMER_STATE,

        // Basic setters
        setMode: (mode: Mode) => set({ mode }),
        setTimeRemaining: (timeRemaining: number) => set({ timeRemaining }),
        setIsActive: (isActive: boolean) => set({ isActive }),
        setPomodorosCompleted: (pomodorosCompleted: number) =>
          set({ pomodorosCompleted }),
        setCurrentTask: (
          currentTaskId?: string,
          currentTaskName?: string,
          currentTaskDescription?: string
        ) => set({ currentTaskId, currentTaskName, currentTaskDescription }),
        setUserPreferences: (userPreferences: User["preferences"]) =>
          set({ userPreferences }),

        // Utility functions
        formatTime: (seconds: number) => {
          const mins = Math.floor(seconds / 60)
            .toString()
            .padStart(2, "0");
          const secs = (seconds % 60).toString().padStart(2, "0");
          return `${mins}:${secs}`;
        },

        getDurationMap: () => {
          const { userPreferences } = get();
          return {
            work: (userPreferences?.pomodoro_working_interval || 25) * 60,
            shortBreak: (userPreferences?.pomodoro_timeout_minutes || 5) * 60,
            longBreak:
              (userPreferences?.pomodoro_long_timeout_minutes || 15) * 60,
          };
        },

        getTimerColors: () => {
          const { mode } = get();
          const isBreak = mode !== "work";
          return {
            timerColor: isBreak
              ? "border-accent-DEFAULT"
              : "border-primary-DEFAULT",
            buttonBgColor: isBreak
              ? "bg-accent-DEFAULT hover:bg-accent-dark"
              : "bg-primary-DEFAULT hover:bg-primary-dark",
            buttonTextColor: "text-white",
          };
        },

        getModeText: () => ({
          work: "Focus",
          shortBreak: "Short Break",
          longBreak: "Long Break",
        }),

        // Timer tick function
        tick: () => {
          const { timeRemaining, isActive } = get();
          if (isActive && timeRemaining > 0) {
            set({ timeRemaining: timeRemaining - 1 });
          } else if (isActive && timeRemaining <= 0) {
            get().switchToNextMode();
          }
        },

        // Initialize from daily stats and check for in-progress tasks
        initializeFromStats: async () => {
          try {
            const stats = await getTodayStats();
            if (stats) {
              set({ pomodorosCompleted: stats.pomodoros_completed });
            }
          } catch (error) {
            console.error("Failed to fetch initial pomodoro stats:", error);
          }
        },

        // Stop current task
        stopCurrentTask: async () => {
          const { currentTaskId } = get();
          if (currentTaskId) {
            try {
              await updateTask(currentTaskId, { status: "pending" });
            } catch (error) {
              console.error(
                "Failed to update task status to 'pending':",
                error
              );
            }
          }
          set({
            currentTaskId: undefined,
            currentTaskName: undefined,
            currentTaskDescription: undefined,
          });
        },

        // Switch to next mode
        switchToNextMode: async () => {
          const {
            mode,
            pomodorosCompleted,
            currentTaskName,
            currentTaskId,
            userPreferences,
            getDurationMap,
          } = get();

          set({ isActive: false });

          let notificationTitle = "";
          let notificationBody = "";
          const durationMap = getDurationMap();

          if (mode === "work") {
            // Update task status to pending but keep task assigned during break
            if (currentTaskId) {
              try {
                await updateTask(currentTaskId, { status: "pending" });
              } catch (error) {
                console.error(
                  "Failed to update task status to 'pending':",
                  error
                );
              }
            }

            const newPomodorosCount = pomodorosCompleted + 1;
            set({ pomodorosCompleted: newPomodorosCount });

            const nextMode =
              newPomodorosCount % CYCLES_BEFORE_LONG_BREAK === 0
                ? "longBreak"
                : "shortBreak";

            set({
              mode: nextMode,
              timeRemaining: durationMap[nextMode],
            });

            notificationTitle = "Work session finished!";
            notificationBody = currentTaskName
              ? `Great job on "${currentTaskName}"! Time for a break.`
              : "Time for a break.";

            try {
              await incrementPomodoro();
            } catch (error) {
              console.error("Failed to increment pomodoro count:", error);
            }

            // Play timer sound
            if (
              userPreferences?.pomodoro_timer_sound &&
              userPreferences.pomodoro_timer_sound !== "none"
            ) {
              try {
                new Audio(
                  `/sounds/${userPreferences.pomodoro_timer_sound}`
                ).play();
              } catch (err) {
                console.error("Failed to play timer sound:", err);
              }
            }
          } else {
            notificationTitle = "Break's over!";
            notificationBody = currentTaskName
              ? `Time to get back to: "${currentTaskName}"`
              : "Time to get back to work!";

            set({
              mode: "work",
              timeRemaining: durationMap.work,
            });
          }

          // Show notification
          if (userPreferences?.system_notifications_enabled) {
            notificationService.showNotification(notificationTitle, {
              body: notificationBody,
            });
          }
        },

        // Start/pause timer
        startPause: async () => {
          const { isActive, currentTaskId, mode } = get();

          // Allow starting break timers, but prevent starting work tasks without a task assigned
          if (!isActive && mode === "work" && !currentTaskId) {
            console.warn("Cannot start work timer without a task assigned");
            return;
          }

          if (currentTaskId) {
            try {
              if (isActive) {
                // Pausing the timer
                await updateTask(currentTaskId, { status: "pending" });
              } else {
                // Starting or resuming the timer
                await updateTask(currentTaskId, { status: "in_progress" });
              }
            } catch (error) {
              console.error("Failed to update task status:", error);
              return;
            }
          }

          set({ isActive: !isActive });
        },

        // Reset timer
        reset: async () => {
          const { mode, stopCurrentTask, getDurationMap } = get();
          await stopCurrentTask();
          const durationMap = getDurationMap();
          set({
            isActive: false,
            timeRemaining: durationMap[mode],
          });
        },

        // Reset for new task
        resetForNewTask: async () => {
          const { stopCurrentTask, getDurationMap } = get();
          await stopCurrentTask();
          const durationMap = getDurationMap();
          set({
            isActive: false,
            mode: "work",
            timeRemaining: durationMap.work,
          });
        },

        // Skip to next mode
        skip: async () => {
          await get().switchToNextMode();
        },

        // Mark task as done
        markTaskAsDone: async (taskId: string) => {
          const { currentTaskId } = get();

          if (currentTaskId === taskId) {
            set({
              isActive: false,
              currentTaskId: undefined,
              currentTaskName: undefined,
              currentTaskDescription: undefined,
            });
          }

          try {
            await updateTask(taskId, { status: "done" });
            // Note: Query invalidation should be handled by the calling component
          } catch (error) {
            console.error("Failed to mark task as done:", error);
          }
        },

        // Clear timer state (useful for logout)
        clearTimerState: () => {
          set({
            ...DEFAULT_TIMER_STATE,
            timestamp: Date.now(),
          });
        },
      }),
      {
        name: LOCAL_STORAGE_KEY,
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          mode: state.mode,
          timeRemaining: state.timeRemaining,
          isActive: state.isActive,
          pomodorosCompleted: state.pomodorosCompleted,
          currentTaskId: state.currentTaskId,
          currentTaskName: state.currentTaskName,
          currentTaskDescription: state.currentTaskDescription,
          timestamp: Date.now(),
          userPreferences: state.userPreferences,
        }),
        // Custom state restoration logic
        onRehydrateStorage: () => (state) => {
          if (state) {
            const timeSinceLastSave = Date.now() - (state.timestamp || 0);

            // If too much time has passed, reset timer state but keep task info
            if (timeSinceLastSave > EXPIRATION_THRESHOLD) {
              console.log(
                "Timer session expired, resetting timer but keeping task"
              );
              state.isActive = false;
              state.mode = "work";
              state.timeRemaining =
                (state.userPreferences?.pomodoro_working_interval || 25) * 60;
              return;
            }

            // Handle timer continuation if it was active
            if (state.isActive && timeSinceLastSave < EXPIRATION_THRESHOLD) {
              const elapsedSeconds = Math.floor(timeSinceLastSave / 1000);
              const newTime = state.timeRemaining - elapsedSeconds;

              if (newTime > 0) {
                // Timer still has time remaining - keep it running
                state.timeRemaining = newTime;
                state.isActive = true; // Continue running if it was active
                console.log(
                  `Timer restored and continuing: ${Math.floor(
                    newTime / 60
                  )}:${(newTime % 60)
                    .toString()
                    .padStart(2, "0")} remaining for task "${
                    state.currentTaskName
                  }"`
                );
              } else {
                // Timer would have expired, reset but keep task
                state.isActive = false;
                state.mode = "work";
                state.timeRemaining =
                  (state.userPreferences?.pomodoro_working_interval || 25) * 60;
                console.log(
                  "Timer expired during absence, reset timer but kept task"
                );
              }
            }

            // Update timestamp
            state.timestamp = Date.now();
          }
        },
      }
    ),
    { name: "timer-store" }
  )
);

// Timer interval management
let timerInterval: NodeJS.Timeout | null = null;

// Start the global timer interval
export const startTimerInterval = () => {
  // Don't start interval in test environment
  if (process.env.NODE_ENV === "test") return;
  if (timerInterval) return; // Already running

  timerInterval = setInterval(() => {
    const { isActive, tick } = useTimerStore.getState();
    if (isActive) {
      tick();
    }
  }, 1000);
};

// Stop the global timer interval
export const stopTimerInterval = () => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
};

// Selectors for optimized subscriptions
export const useTimerMode = () => useTimerStore((state) => state.mode);
export const useTimerRemaining = () =>
  useTimerStore((state) => state.timeRemaining);
export const useTimerActive = () => useTimerStore((state) => state.isActive);
export const useTimerPomodoros = () =>
  useTimerStore((state) => state.pomodorosCompleted);
export const useTimerCurrentTask = () => {
  const currentTaskId = useTimerStore((state) => state.currentTaskId);
  const currentTaskName = useTimerStore((state) => state.currentTaskName);
  const currentTaskDescription = useTimerStore(
    (state) => state.currentTaskDescription
  );

  return useMemo(
    () => ({
      id: currentTaskId,
      name: currentTaskName,
      description: currentTaskDescription,
    }),
    [currentTaskId, currentTaskName, currentTaskDescription]
  );
};
export const useTimerColors = () => {
  const mode = useTimerStore((state) => state.mode);
  return useMemo(() => {
    const isBreak = mode !== "work";
    return {
      timerColor: isBreak ? "border-accent-DEFAULT" : "border-primary-DEFAULT",
      buttonBgColor: isBreak
        ? "bg-accent-DEFAULT hover:bg-accent-dark"
        : "bg-primary-DEFAULT hover:bg-primary-dark",
      buttonTextColor: "text-white",
    };
  }, [mode]);
};

export const useTimerModeText = () => {
  const mode = useTimerStore((state) => state.mode);
  return useMemo(() => {
    switch (mode) {
      case "work":
        return "Focus";
      case "shortBreak":
        return "Short Break";
      case "longBreak":
        return "Long Break";
      default:
        return "";
    }
  }, [mode]);
};

export const useTimerButtonStates = () => {
  const mode = useTimerStore((state) => state.mode);
  const isActive = useTimerStore((state) => state.isActive);
  const currentTask = useTimerCurrentTask();

  return useMemo(
    () => ({
      resetDisabled: !currentTask?.id,
      skipBreakVisible: mode !== "work",
      skipBreakEnabled: mode !== "work" && isActive,
    }),
    [mode, isActive, currentTask]
  );
};
export const useTimerActions = () => {
  const startPause = useTimerStore((state) => state.startPause);
  const reset = useTimerStore((state) => state.reset);
  const skip = useTimerStore((state) => state.skip);
  const stopCurrentTask = useTimerStore((state) => state.stopCurrentTask);
  const resetForNewTask = useTimerStore((state) => state.resetForNewTask);
  const markTaskAsDone = useTimerStore((state) => state.markTaskAsDone);
  const setCurrentTask = useTimerStore((state) => state.setCurrentTask);
  const setUserPreferences = useTimerStore((state) => state.setUserPreferences);
  const formatTime = useTimerStore((state) => state.formatTime);

  return useMemo(
    () => ({
      startPause,
      reset,
      skip,
      stopCurrentTask,
      resetForNewTask,
      markTaskAsDone,
      setCurrentTask,
      setUserPreferences,
      formatTime,
    }),
    [
      startPause,
      reset,
      skip,
      stopCurrentTask,
      resetForNewTask,
      markTaskAsDone,
      setCurrentTask,
      setUserPreferences,
      formatTime,
    ]
  );
};

// Initialize timer store
export const initializeTimer = async () => {
  // Don't initialize in test environment
  if (process.env.NODE_ENV === "test") return;

  // Zustand persist middleware will automatically restore state from localStorage
  // with our custom onRehydrateStorage logic handling timer continuation

  const { initializeFromStats } = useTimerStore.getState();
  await initializeFromStats();

  startTimerInterval();
};
