import React, { useEffect } from 'react';
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';
import { cn } from '../lib/utils';
import { useDroppable } from '@dnd-kit/core';
import { useSharedTimerContext } from '../context/SharedTimerContext';

const PomodoroTimer: React.FC = () => {
  const {
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
    setCurrentTaskId,
    setOnTaskComplete,
    currentTaskName,
  } = useSharedTimerContext();

  const { setNodeRef, isOver } = useDroppable({
    id: 'pomodoro-drop-zone',
  });

  return (
    <section className="w-full max-w-lg mx-auto" role="main" aria-label="Pomodoro Timer">
      <div className="transition-all duration-300">
        <div className={cn("text-card-foreground flex flex-col gap-6 rounded-xl border py-6 relative overflow-hidden bg-gray-900/50 backdrop-blur-sm shadow-2xl transition-all", isBreak ? 'border-green-500/50' : 'border-gray-700/50')}>
          <div className="p-8 md:p-12 flex flex-col items-center space-y-8">
            <div className="relative w-full flex justify-center">
              <figure className="relative flex flex-col items-center" role="timer" aria-label="Pomodoro Timer">
                <div className="relative">
                  <div
                    ref={setNodeRef}
                    className={cn(
                      "relative w-72 h-72 md:w-80 md:h-80 rounded-full bg-gray-800 border-2 shadow-lg transition-all duration-300 flex items-center justify-center",
                      timerColor,
                      isOver && 'border-sky-400 ring-4 ring-sky-400/20',
                    )}
                    tabIndex={0}
                    role="button"
                    aria-label="Timer drop zone - drag tasks here to focus"
                  >
                    <div className="text-center">
                      {isOver ? (
                        <p className="text-2xl font-bold text-sky-300">Drop Task to Begin</p>
                      ) : (
                        <>
                          {currentTaskName && (
                            <p className="text-xl font-semibold text-white mb-2">{currentTaskName}</p>
                          )}
                          <div className="text-5xl md:text-6xl font-bold font-mono text-white">
                            {formatTime(timeRemaining)}
                          </div>
                        </>
                      )}
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
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none"></div>
          <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full blur-3xl pointer-events-none"></div>
        </div>
      </div>
    </section>
  );
};

export default PomodoroTimer;
