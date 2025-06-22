import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { TaskUpdateRequest, Task } from '../types/task';

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

interface TimerState {
  mode: Mode;
  timeRemaining: number;
  isActive: boolean;
  pomodorosCompleted: number;
  timestamp?: number;
}

interface SharedTimerContextType {
  mode: Mode;
  timeRemaining: number;
  isActive: boolean;
  pomodorosCompleted: number;
  handleStartPause: () => void;
  handleReset: () => void;
  handleSkip: () => void;
  formatTime: (seconds: number) => string;
  isBreak: boolean;
  timerColor: string;
  buttonBgColor: string;
  buttonTextColor: string;
  modeText: Record<Mode, string>;
  currentTaskId: string | undefined;
  currentTaskName: string | undefined;
  onTaskComplete: ((taskId: string, taskData: TaskUpdateRequest) => Promise<Task>) | undefined;
  setCurrentTaskId: React.Dispatch<React.SetStateAction<string | undefined>>;
  setCurrentTaskName: React.Dispatch<React.SetStateAction<string | undefined>>;
  setOnTaskComplete: React.Dispatch<React.SetStateAction<((taskId: string, taskData: TaskUpdateRequest) => Promise<Task>) | undefined>>;
  stopCurrentTask: () => Promise<void>;
}

const SharedTimerContext = createContext<SharedTimerContextType | undefined>(undefined);

export const SharedTimerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<Mode>('work');
  const [timeRemaining, setTimeRemaining] = useState(WORK_DURATION);
  const [isActive, setIsActive] = useState(false);
  const [pomodorosCompleted, setPomodorosCompleted] = useState(0);
  const [currentTaskId, setCurrentTaskId] = useState<string | undefined>(undefined);
  const [currentTaskName, setCurrentTaskName] = useState<string | undefined>(undefined);
  const [onTaskComplete, setOnTaskComplete] = useState<((taskId: string, taskData: TaskUpdateRequest) => Promise<Task>) | undefined>(undefined);

  const stopCurrentTask = useCallback(async () => {
    if (currentTaskId && onTaskComplete) {
      try {
        await onTaskComplete(currentTaskId, { status: 'pending' });
      } catch (error) {
        console.error("Failed to update task status to 'done':", error);
      }
    }
    setCurrentTaskId(undefined);
    setCurrentTaskName(undefined);
    setOnTaskComplete(undefined);
  }, [currentTaskId, onTaskComplete]); // FIXED: Added dependencies

  const switchToNextMode = useCallback(async () => {
    setIsActive(false);

    if (mode === 'work') {
      await stopCurrentTask();
      const newPomodorosCount = pomodorosCompleted + 1;
      setPomodorosCompleted(newPomodorosCount);
      const nextMode = newPomodorosCount % CYCLES_BEFORE_LONG_BREAK === 0 ? 'longBreak' : 'shortBreak';
      setMode(nextMode);
      setTimeRemaining(DURATION_MAP[nextMode]);
    } else {
      setMode('work');
      setTimeRemaining(WORK_DURATION);
    }
  }, [mode, pomodorosCompleted, stopCurrentTask]);

  // FIXED: Added dependency array to prevent infinite loop
  useEffect(() => {
    try {
      const serializedState = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!serializedState) return;
      const state: TimerState & { timestamp: number } = JSON.parse(serializedState);
      const timeSinceLastSave = Date.now() - state.timestamp;

      if (timeSinceLastSave > EXPIRATION_THRESHOLD) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        return;
      }

      setMode(state.mode);
      setPomodorosCompleted(state.pomodorosCompleted);
      setIsActive(state.isActive);

      if (state.isActive) {
        const elapsedSeconds = Math.floor(timeSinceLastSave / 1000);
        const newTime = state.timeRemaining - elapsedSeconds;
        setTimeRemaining(newTime > 0 ? newTime : 0);
        if (newTime <= 0) setIsActive(false);
      } else {
        setTimeRemaining(state.timeRemaining);
      }
    } catch (error) {
      console.error("Failed to load state from localStorage:", error);
    }
  }, []); // FIXED: Added empty dependency array

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && timeRemaining > 0) {
      interval = setInterval(() => setTimeRemaining(prev => prev - 1), 1000);
    } else if (isActive && timeRemaining <= 0) {
      // IMPROVED: Make timer completion async-safe
      const handleTimerComplete = async () => {
        await switchToNextMode();
      };
      handleTimerComplete();
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isActive, timeRemaining, switchToNextMode]);

  useEffect(() => {
    const state: TimerState & { timestamp: number } = { mode, timeRemaining, isActive, pomodorosCompleted, timestamp: Date.now() };
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error("Failed to save state to localStorage:", error);
    }
  }, [mode, timeRemaining, isActive, pomodorosCompleted]);

  const handleStartPause = useCallback(() => {
    if (isActive) {
      stopCurrentTask();
    }
    setIsActive(prev => !prev);
  }, [isActive, stopCurrentTask]); // IMPROVED: Added dependencies

  const handleReset = useCallback(() => {
    stopCurrentTask();
    setIsActive(false);
    setTimeRemaining(DURATION_MAP[mode]);
  }, [stopCurrentTask, mode]); // IMPROVED: Added dependencies

  const handleSkip = useCallback(() => {
    switchToNextMode();
  }, [switchToNextMode]); // IMPROVED: Added dependency

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }, []); // IMPROVED: Made it a useCallback for performance

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
    onTaskComplete,
    setCurrentTaskId,
    setCurrentTaskName,
    setOnTaskComplete,
    stopCurrentTask,
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
