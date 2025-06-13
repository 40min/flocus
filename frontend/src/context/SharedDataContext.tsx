import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect, useRef } from 'react';

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

export interface TimerState {
  mode: Mode;
  timeRemaining: number;
  isActive: boolean;
  pomodorosCompleted: number;
  timestamp?: number;
}

type OnWorkCompleteCallback = () => Promise<void>;

interface SharedDataContextType {
  mode: Mode;
  timeRemaining: number;
  isActive: boolean;
  pomodorosCompleted: number;
  handleStartPause: () => void;
  handleReset: () => void;
  handleSkip: () => void;
  registerOnWorkComplete: (cb: OnWorkCompleteCallback) => void;
  unregisterOnWorkComplete: () => void;
}

const SharedDataContext = createContext<SharedDataContextType | undefined>(undefined);

export const SharedDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<Mode>('work');
  const [timeRemaining, setTimeRemaining] = useState(WORK_DURATION);
  const [isActive, setIsActive] = useState(false);
  const [pomodorosCompleted, setPomodorosCompleted] = useState(0);

  const onWorkCompleteCallback = useRef<OnWorkCompleteCallback | null>(null);

  const switchToNextMode = useCallback(async () => {
    setIsActive(false);

    if (mode === 'work') {
      if (onWorkCompleteCallback.current) {
        try {
          await onWorkCompleteCallback.current();
        } catch (error) {
          console.error("onWorkCompleteCallback failed:", error);
        }
      }
      const newPomodorosCount = pomodorosCompleted + 1;
      setPomodorosCompleted(newPomodorosCount);
      const nextMode = newPomodorosCount % CYCLES_BEFORE_LONG_BREAK === 0 ? 'longBreak' : 'shortBreak';
      setMode(nextMode);
      setTimeRemaining(DURATION_MAP[nextMode]);
    } else {
      setMode('work');
      setTimeRemaining(WORK_DURATION);
    }
  }, [mode, pomodorosCompleted]);

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
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && timeRemaining > 0) {
      interval = setInterval(() => setTimeRemaining(prev => prev - 1), 1000);
    } else if (isActive && timeRemaining <= 0) {
      switchToNextMode();
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

  const handleStartPause = () => setIsActive(prev => !prev);
  const handleReset = () => { setIsActive(false); setTimeRemaining(DURATION_MAP[mode]); };
  const handleSkip = () => switchToNextMode();
  const registerOnWorkComplete = useCallback((cb: OnWorkCompleteCallback) => { onWorkCompleteCallback.current = cb; }, []);
  const unregisterOnWorkComplete = useCallback(() => { onWorkCompleteCallback.current = null; }, []);

  const value = { mode, timeRemaining, isActive, pomodorosCompleted, handleStartPause, handleReset, handleSkip, registerOnWorkComplete, unregisterOnWorkComplete };

  return (
    <SharedDataContext.Provider value={value}>
      {children}
    </SharedDataContext.Provider>
  );
};

export const useSharedDataContext = () => {
  const context = useContext(SharedDataContext);
  if (!context) {
    throw new Error('useSharedDataContext must be used within a SharedDataProvider');
  }
  return context;
};
