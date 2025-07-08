import React from 'react';
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../lib/utils';
import { useDroppable } from '@dnd-kit/core';
import { useSharedTimerContext } from '../context/SharedTimerContext';
import Button from 'components/Button';

const PomodoroTimer: React.FC = () => {
  const {
    timeRemaining,
    isActive,
    pomodorosCompleted,
    handleStartPause,
    handleReset,
    handleSkip,
    formatTime,
    isBreak,
    timerColor,
    currentTaskName,
    currentTaskDescription,
  } = useSharedTimerContext();

  const { setNodeRef, isOver } = useDroppable({
    id: 'pomodoro-drop-zone',
  });

  return (
    <section className="w-full max-w-lg mx-auto" role="main" aria-label="Pomodoro Timer">
      <div className="transition-all duration-300">
        <div className={cn("text-card-foreground flex flex-col gap-6 rounded-xl border py-6 relative overflow-hidden bg-background-card shadow-lg transition-all", isBreak ? 'border-accent-DEFAULT/50' : 'border-border-DEFAULT')}>
          <div className="p-8 md:p-12 flex flex-col items-center space-y-8">
            <div className="relative w-full flex justify-center">
              <figure className="relative flex flex-col items-center" role="timer" aria-label="Pomodoro Timer">
                <div className="relative">
                  <div
                    ref={setNodeRef}
                    className={cn(
                      "relative w-60 h-60 md:w-72 md:h-72 rounded-full bg-background-card border-2 shadow-lg transition-all duration-300 flex items-center justify-center",
                      timerColor,
                      isOver && 'border-primary-light ring-4 ring-primary-light/20',
                    )}
                    tabIndex={0}
                    role="button"
                    aria-label="Timer drop zone - drag tasks here to focus"
                  >
                    <div className="text-center">
                      {isOver ? (
                        <p className="text-2xl font-bold text-primary-light">Drop Task to Begin</p>
                      ) : (
                        <>
                          {currentTaskName && (
                            <p className="text-xl font-semibold text-text-DEFAULT mb-2">{currentTaskName}</p>
                          )}

                          <div className="text-5xl md:text-6xl font-bold font-mono text-text-DEFAULT">
                            {formatTime(timeRemaining)}
                          </div>
                        </>
                      )}
                      <div className="flex gap-2 justify-center mt-4">
                        <Button
                          onClick={handleReset}
                          variant="secondary"
                          size="icon"
                          aria-label="Reset timer"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={handleSkip}
                          variant="secondary"
                          size="icon"
                          aria-label="Skip break"
                        >
                          <SkipForward className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </figure>
            </div>
            <div className="flex justify-center" tabIndex={0}>
              <Button
                onClick={handleStartPause}
                variant="slate"
                size="fat"
                className="rounded-full"
                aria-label="Start/Pause timer"
              >
                <div className="flex items-center gap-2 justify-center">
                  {isActive ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  <span>{isActive ? 'Pause' : 'Start'}</span>
                </div>
              </Button>
            </div>
            <div className="text-center space-y-2">
              <p className="text-text-light text-xs md:text-sm font-medium">
                Completed: {pomodorosCompleted}
              </p>
              {currentTaskDescription && (
                <div className="text-sm text-text-secondary mt-4 max-h-20 overflow-y-auto px-4">
                  <p className="font-semibold">Description:</p>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ node, children, ...props }) => <a className="text-primary-DEFAULT underline hover:text-primary-dark" {...props as React.AnchorHTMLAttributes<HTMLAnchorElement>} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.preventDefault(); window.open((props as React.AnchorHTMLAttributes<HTMLAnchorElement>).href, '_blank'); }}>{children}</a>,

                    }}
                  >
                    {currentTaskDescription}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default PomodoroTimer;
