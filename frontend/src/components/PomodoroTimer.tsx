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
    currentTaskName,
  } = useSharedTimerContext();

  const { setNodeRef, isOver } = useDroppable({
    id: 'pomodoro-drop-zone',
  });

  return (
    <section className="w-full max-w-lg mx-auto" role="main" aria-label="Pomodoro Timer">
      <div className="transition-all duration-300">
        <div className={cn("text-card-foreground flex flex-col gap-6 rounded-xl border py-6 relative overflow-hidden bg-white shadow-lg transition-all", isBreak ? 'border-green-500/50' : 'border-gray-700/50')}>
          <div className="p-8 md:p-12 flex flex-col items-center space-y-8">
            <div className="relative w-full flex justify-center">
              <figure className="relative flex flex-col items-center" role="timer" aria-label="Pomodoro Timer">
                <div className="relative">
                  <div
                    ref={setNodeRef}
                    className={cn(
                      "relative w-60 h-60 md:w-72 md:h-72 rounded-full bg-white border-2 shadow-lg transition-all duration-300 flex items-center justify-center",
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
                            <p className="text-xl font-semibold text-gray-800 mb-2">{currentTaskName}</p>
                          )}
                          <div className="text-5xl md:text-6xl font-bold font-mono text-gray-800">
                            {formatTime(timeRemaining)}
                          </div>
                        </>
                      )}
                      <div className="flex gap-2 justify-center mt-4">
                        <button
                          onClick={handleReset}
                          className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium disabled:pointer-events-none disabled:opacity-50 size-9 h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transition-all duration-200 text-gray-800"
                          aria-label="Reset timer"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                        <button
                          onClick={handleSkip}
                          className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium disabled:pointer-events-none disabled:opacity-50 size-9 h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transition-all duration-200 text-gray-800"
                          aria-label="Skip break"
                        >
                          <SkipForward className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </figure>
            </div>
            <div className="w-full max-w-xs" tabIndex={0}>
              <button
                onClick={handleStartPause}
                className={cn(
                  "inline-flex items-center justify-center gap-2 whitespace-nowrap px-6 w-full h-10 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 focus:ring-4 focus:ring-primary/20 focus:outline-none",
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
              <p className="text-gray-600 text-sm md:text-base font-medium">
                Completed: {pomodorosCompleted}
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default PomodoroTimer;
