import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { useUpdateTask } from '../hooks/useTasks';
import { useQueryClient } from '@tanstack/react-query';
import { getTodayStats, incrementPomodoro } from '../services/userDailyStatsService';

const WORK_DURATION = 25 * 60;
const SHORT_BREAK_DURATION = 5 * 60;
const LONG_BREAK_DURATION = 15 * 60;
const CYCLES_BEFORE_LONG_BREAK = 4;
const LOCAL_STORAGE_KEY = 'pomodoroTimerState';
const EXPIRATION_THRESHOLD = 60 * 60 * 1000; // 1 hour

type Mode = 'work' | 'shortBreak' | 'longBreak';

const DURATION_MAP: Record<Mode, number> = {
  work: WORK_DURATION,
  shortBreak: SHORT_BREAK_DURATION,
  longBreak: LONG_BREAK_DURATION,
};

// Default state constants
const DEFAULT_TIMER_STATE = {
  mode: 'work' as Mode,
  timeRemaining: WORK_DURATION,
  isActive: false,
  pomodorosCompleted: 0,
  currentTaskId: undefined as string | undefined,
  currentTaskName: undefined as string | undefined,
  currentTaskDescription: undefined as string | undefined,
};

interface TimerState {
  mode: Mode;
  timeRemaining: number;
  isActive: boolean;
  pomodorosCompleted: number;
  currentTaskId?: string;
  currentTaskName?: string;
  currentTaskDescription?: string;
  timestamp: number;
}

interface SharedTimerContextType {
  mode: Mode;
  timeRemaining: number;
  isActive: boolean;
  pomodorosCompleted: number;
  handleStartPause: () => void;
  setIsActive: React.Dispatch<React.SetStateAction<boolean>>;
  handleReset: () => void;
  handleSkip: () => Promise<void>;
  formatTime: (seconds: number) => string;
  isBreak: boolean;
  timerColor: string;
  buttonBgColor: string;
  buttonTextColor: string;
  modeText: Record<Mode, string>;
  currentTaskId: string | undefined;
  currentTaskName: string | undefined;
  currentTaskDescription: string | undefined;
  setCurrentTaskId: React.Dispatch<React.SetStateAction<string | undefined>>;
  setCurrentTaskName: React.Dispatch<React.SetStateAction<string | undefined>>;
  setCurrentTaskDescription: React.Dispatch<React.SetStateAction<string | undefined>>;
  stopCurrentTask: () => Promise<void>;
  resetForNewTask: () => Promise<void>;
  handleMarkAsDone: (taskId: string) => void;
}

// --- State initialization from localStorage ---
function getInitialTimerState() {
  try {
    const serializedState = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!serializedState) return DEFAULT_TIMER_STATE;

    const state: TimerState = JSON.parse(serializedState);
    const timeSinceLastSave = Date.now() - state.timestamp;

    if (timeSinceLastSave > EXPIRATION_THRESHOLD) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      return DEFAULT_TIMER_STATE;
    }

    let restoredState = {
      mode: state.mode,
      timeRemaining: state.timeRemaining,
      isActive: state.isActive, // Restore isActive state from localStorage
      pomodorosCompleted: state.pomodorosCompleted,
      currentTaskId: state.currentTaskId,
      currentTaskName: state.currentTaskName,
      currentTaskDescription: state.currentTaskDescription,
    };

    // Handle timer continuation if it was active
    if (state.isActive) {
      const elapsedSeconds = Math.floor(timeSinceLastSave / 1000);
      const newTime = state.timeRemaining - elapsedSeconds;
      restoredState.timeRemaining = newTime > 0 ? newTime : 0;
      restoredState.isActive = newTime > 0;
    }

    return restoredState;
  } catch (error) {
    console.error('Failed to restore timer state:', error);
    return DEFAULT_TIMER_STATE;
  }
}

const SharedTimerContext = createContext<SharedTimerContextType | undefined>(undefined);

export const SharedTimerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const initialState = getInitialTimerState();
  const [mode, setMode] = useState<Mode>(initialState.mode);
  const [timeRemaining, setTimeRemaining] = useState(initialState.timeRemaining);
  const [isActive, setIsActive] = useState(initialState.isActive);
  const [pomodorosCompleted, setPomodorosCompleted] = useState(initialState.pomodorosCompleted);
  const [currentTaskId, setCurrentTaskId] = useState<string | undefined>(initialState.currentTaskId);
  const [currentTaskName, setCurrentTaskName] = useState<string | undefined>(initialState.currentTaskName);
  const [currentTaskDescription, setCurrentTaskDescription] = useState<string | undefined>(initialState.currentTaskDescription);

  const { mutateAsync: updateTask } = useUpdateTask();
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const stats = await getTodayStats();
        if (stats) {
          setPomodorosCompleted(stats.pomodoros_completed);
        }
      } catch (error) {
        console.error("Failed to fetch initial pomodoro stats:", error);
      }
    };

    fetchStats();
  }, []); // Empty dependency array to run only on mount

  const stopCurrentTask = useCallback(async () => {
    if (currentTaskId) {
      try {
        await updateTask({ taskId: currentTaskId, taskData: { status: 'pending' } });
      } catch (error) {
        console.error("Failed to update task status to 'pending':", error);
      }
    }
    setCurrentTaskId(undefined);
    setCurrentTaskName(undefined);
    setCurrentTaskDescription(undefined);
  }, [currentTaskId, updateTask]);

  const switchToNextMode = useCallback(async () => {
    setIsActive(false);

    if (mode === 'work') {
      await stopCurrentTask();
      const newPomodorosCount = pomodorosCompleted + 1;
      setPomodorosCompleted(newPomodorosCount);
      const nextMode = newPomodorosCount % CYCLES_BEFORE_LONG_BREAK === 0 ? 'longBreak' : 'shortBreak';
      setMode(nextMode);
      setTimeRemaining(DURATION_MAP[nextMode]);
      try {
        await incrementPomodoro();
      } catch (error) {
        console.error("Failed to increment pomodoro count:", error);
        // Optionally, add logic to handle this failure, e.g., retry or notify user
      }
    } else {
      setMode('work');
      setTimeRemaining(WORK_DURATION);
    }
  }, [mode, pomodorosCompleted, stopCurrentTask]);

  // Timer countdown effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && timeRemaining > 0) {
      interval = setInterval(() => setTimeRemaining(prev => prev - 1), 1000);
    } else if (isActive && timeRemaining <= 0) {
      const handleTimerComplete = async () => {
        await switchToNextMode();
      };
      handleTimerComplete();
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isActive, timeRemaining, switchToNextMode]);

  // Persist state to localStorage
  useEffect(() => {
    const state: TimerState = {
      mode,
      timeRemaining,
      isActive,
      pomodorosCompleted,
      currentTaskId,
      currentTaskName,
      currentTaskDescription,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error("Failed to save state to localStorage:", error);
    }
  }, [mode, timeRemaining, isActive, pomodorosCompleted, currentTaskId, currentTaskName, currentTaskDescription]);

  const handleStartPause = useCallback(async () => {
    if (currentTaskId) {
      try {
        if (isActive) { // Pausing the timer
          await updateTask({ taskId: currentTaskId, taskData: { status: 'pending' } });
        } else { // Starting or resuming the timer
          await updateTask({ taskId: currentTaskId, taskData: { status: 'in_progress' } });
        }
      } catch (error) {
        console.error('Failed to update task status:', error);
        return;
      }
    }
    setIsActive(prev => !prev);
  }, [isActive, currentTaskId, updateTask]);

  const handleReset = useCallback(async () => {
    await stopCurrentTask();
    setIsActive(false);
    setTimeRemaining(DURATION_MAP[mode]);
  }, [stopCurrentTask, mode]);

  const resetForNewTask = useCallback(async () => {
    await stopCurrentTask();
    setIsActive(false);
    setMode('work');
    setTimeRemaining(WORK_DURATION);
  }, [stopCurrentTask]);

  const handleSkip = useCallback(async () => {
    await switchToNextMode();
  }, [switchToNextMode]);

  const handleMarkAsDone = useCallback(async (taskId: string) => {
    if (currentTaskId === taskId) {
      setIsActive(false);
      setCurrentTaskId(undefined);
      setCurrentTaskName(undefined);
      setCurrentTaskDescription(undefined);
    }
    await updateTask(
      { taskId: taskId, taskData: { status: 'done' } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['dailyPlan', 'today'] });
        },
      },
    );
  }, [currentTaskId, updateTask, queryClient]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }, []);

  const isBreak = mode !== 'work';
  const timerColor = isBreak ? 'border-accent-DEFAULT' : 'border-primary-DEFAULT';
  const buttonBgColor = isBreak ? 'bg-accent-DEFAULT hover:bg-accent-dark' : 'bg-primary-DEFAULT hover:bg-primary-dark';
  const buttonTextColor = 'text-white';

  const modeText = {
    work: 'Focus',
    shortBreak: 'Short Break',
    longBreak: 'Long Break',
  };

  const value = {
    mode,
    timeRemaining,
    isActive,
    pomodorosCompleted,
    handleStartPause,
    handleReset,
    handleSkip,
    formatTime,
    isBreak,
    timerColor,
    buttonBgColor,
    buttonTextColor,
    modeText,
    currentTaskId,
    currentTaskName,
    currentTaskDescription,
    setCurrentTaskId,
    setCurrentTaskName,
    setCurrentTaskDescription,
    stopCurrentTask,
    resetForNewTask,
    setIsActive,
    handleMarkAsDone,
  };

  return (
    <SharedTimerContext.Provider value={value}>
      {children}
    </SharedTimerContext.Provider>
  );
};

export const useSharedTimerContext = () => {
  const context = useContext(SharedTimerContext);
  if (!context) {
    throw new Error('useSharedTimerContext must be used within a SharedTimerProvider');
  }
  return context;
};
