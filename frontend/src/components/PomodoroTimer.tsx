import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';
import { cn } from '../lib/utils';

const WORK_DURATION = 25 * 60;
const SHORT_BREAK_DURATION = 5 * 60;
const LONG_BREAK_DURATION = 15 * 60;
const CYCLES_BEFORE_LONG_BREAK = 4;

type Mode = 'work' | 'shortBreak' | 'longBreak';

const DURATION_MAP: Record<Mode, number> = {
  work: WORK_DURATION,
  shortBreak: SHORT_BREAK_DURATION,
  longBreak: LONG_BREAK_DURATION,
};

const PomodoroTimer: React.FC = () => {
  const [mode, setMode] = useState<Mode>('work');
  const [timeRemaining, setTimeRemaining] = useState(WORK_DURATION);
  const [isActive, setIsActive] = useState(false);
  const [pomodorosCompleted, setPomodorosCompleted] = useState(0);

  const switchToNextMode = useCallback(() => {
    setIsActive(false);

    if (mode === 'work') {
      const nextPomodorosCount = pomodorosCompleted + 1;
      setPomodorosCompleted(nextPomodorosCount);

      const nextMode = nextPomodorosCount % CYCLES_BEFORE_LONG_BREAK === 0 ? 'longBreak' : 'shortBreak';
      setMode(nextMode);
      setTimeRemaining(DURATION_MAP[nextMode]);
    } else { // It was a break
      setMode('work');
      setTimeRemaining(DURATION_MAP['work']);
    }
  }, [mode, pomodorosCompleted]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(time => time - 1);
      }, 1000);
    } else if (timeRemaining === 0) {
      // TODO: Play sound
      switchToNextMode();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeRemaining, switchToNextMode]);

  const handleStartPause = () => setIsActive(prev => !prev);
  const handleReset = () => {
    setIsActive(false);
    setTimeRemaining(DURATION_MAP[mode]);
  };
  const handleSkip = () => switchToNextMode();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const isBreak = mode !== 'work';
  const timerColor = isBreak ? 'border-green-500' : 'border-gray-700';
  const buttonBgColor = isBreak ? 'bg-green-500 hover:bg-green-600' : 'bg-white hover:bg-gray-200';
  const buttonTextColor = isBreak ? 'text-white' : 'text-gray-900';

  const modeText = {
    work: 'Focus',
    shortBreak: 'Short Break',
    longBreak: 'Long Break',
  };

  return (
    <section className="w-full max-w-lg mx-auto" role="main" aria-label="Pomodoro Timer">
      <div className="transition-all duration-300">
        <div className={cn("text-card-foreground flex flex-col gap-6 rounded-xl border py-6 relative overflow-hidden bg-gray-900/50 backdrop-blur-sm shadow-2xl transition-all", isBreak ? 'border-green-500/50' : 'border-gray-700/50')}>
          <div className="p-8 md:p-12 flex flex-col items-center space-y-8">
            <div className="relative w-full flex justify-center">
              <figure className="relative flex flex-col items-center" role="timer" aria-label="Pomodoro Timer">
                <div className="relative">
                  <div
                    className={cn(
                      "relative w-72 h-72 md:w-80 md:h-80 rounded-full bg-gray-800 border-2 shadow-lg transition-all duration-300 flex items-center justify-center",
                      timerColor
                    )}
                    tabIndex={0}
                    role="button"
                    aria-label="Timer drop zone - drag tasks here to focus"
                  >
                    <div className="text-center">
                      <div className="text-5xl md:text-6xl font-bold font-mono text-white">
                        {formatTime(timeRemaining)}
                      </div>
                      <p className="text-sm text-gray-400 mt-2 max-w-32">
                        {modeText[mode]}
                      </p>
                    </div>
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button
                        onClick={handleReset}
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium disabled:pointer-events-none disabled:opacity-50 size-9 h-8 w-8 rounded-full bg-gray-700/80 hover:bg-gray-700 border border-gray-600/50 hover:border-gray-600 shadow-sm hover:shadow-md transition-all duration-200 text-white"
                        aria-label="Reset timer"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                      <button
                        onClick={handleSkip}
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium disabled:pointer-events-none disabled:opacity-50 size-9 h-8 w-8 rounded-full bg-gray-700/80 hover:bg-gray-700 border border-gray-600/50 hover:border-gray-600 shadow-sm hover:shadow-md transition-all duration-200 text-white"
                        aria-label="Skip break"
                      >
                        <SkipForward className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </figure>
            </div>
            <div className="w-full max-w-xs" tabIndex={0}>
              <button
                onClick={handleStartPause}
                className={cn(
                  "inline-flex items-center justify-center gap-2 whitespace-nowrap px-6 w-full h-14 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 focus:ring-4 focus:ring-primary/20 focus:outline-none",
                  buttonBgColor,
                  buttonTextColor
                )}
                aria-label="Start/Pause timer"
              >
                <div className="flex items-center gap-2">
                  {isActive ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  <span>{isActive ? 'Pause' : 'Start'}</span>
                </div>
              </button>
            </div>
            <div className="text-center space-y-2">
              <p className="text-gray-400 text-sm md:text-base font-medium">
                Completed: {pomodorosCompleted}
              </p>
            </div>
          </div>
          <div className={cn("absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none", isBreak && 'from-green-500/10 to-teal-500/10')}></div>
          <div className={cn("absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl pointer-events-none transition-all", isBreak ? 'bg-green-500/10' : 'bg-blue-500/10')}></div>
          <div className={cn("absolute -bottom-24 -left-24 w-48 h-48 rounded-full blur-3xl pointer-events-none transition-all", isBreak ? 'bg-teal-500/10' : 'bg-purple-500/10')}></div>
        </div>
      </div>
    </section>
  );
};

export default PomodoroTimer;
