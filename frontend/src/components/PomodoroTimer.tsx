import React from "react";
import { Play, Pause, RotateCcw, SkipForward } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "../utils/utils";
import { useDroppable } from "@dnd-kit/core";
import { useTimer } from "../hooks/useTimer";
import { Button } from "@/components/ui/button";

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
  } = useTimer();

  const { setNodeRef, isOver } = useDroppable({
    id: "pomodoro-drop-zone",
  });

  return (
    <section
      className="w-full max-w-lg mx-auto"
      role="main"
      aria-label="Pomodoro Timer"
    >
      <div className="transition-all duration-300">
        <div
          className={cn(
            "text-card-foreground flex flex-col gap-6 rounded-xl border py-6 relative overflow-hidden bg-background-card shadow-lg transition-all",
            isBreak ? "border-accent-DEFAULT/50" : "border-border-DEFAULT"
          )}
        >
          <div className="p-8 md:p-12 flex flex-col items-center space-y-8">
            <div className="relative w-full flex justify-center">
              <figure
                className="relative flex flex-col items-center"
                role="timer"
                aria-label="Pomodoro Timer"
              >
                <div className="relative">
                  <div
                    ref={setNodeRef}
                    className={cn(
                      "relative w-60 h-60 md:w-72 md:h-72 rounded-full bg-background-card border-2 shadow-lg transition-all duration-300 flex items-center justify-center",
                      timerColor,
                      isOver &&
                        "border-primary-light ring-4 ring-primary-light/20"
                    )}
                    tabIndex={0}
                    role="button"
                    aria-label="Timer drop zone - drag tasks here to focus"
                  >
                    <div className="text-center">
                      {isOver ? (
                        <p className="text-2xl font-bold text-primary-light">
                          Drop Task to Begin
                        </p>
                      ) : (
                        <>
                          {/* Task name - always show if available */}
                          {currentTaskName && (
                            <div className="mb-4">
                              <p className="text-lg md:text-xl font-semibold text-text-DEFAULT mb-1">
                                {currentTaskName}
                              </p>
                              {currentTaskDescription && (
                                <p
                                  className="text-sm text-text-secondary max-w-48 mx-auto overflow-hidden"
                                  style={{
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                  }}
                                >
                                  {currentTaskDescription}
                                </p>
                              )}
                            </div>
                          )}

                          <div className="text-5xl md:text-6xl font-bold font-mono text-text-DEFAULT">
                            {formatTime(timeRemaining)}
                          </div>

                          {/* Show task status when no task is selected */}
                          {!currentTaskName && (
                            <p className="text-sm text-text-secondary mt-2">
                              Drag a task here to start focusing
                            </p>
                          )}
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
                variant={isActive ? "destructive" : "default"}
                size="fat"
                className={cn(
                  "rounded-full transition-all duration-200 min-w-[120px]",
                  isActive
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-green-500 hover:bg-green-600 text-white"
                )}
                aria-label={isActive ? "Pause timer" : "Start timer"}
                disabled={!currentTaskName && !isActive} // Disable start if no task selected
              >
                <div className="flex items-center gap-2 justify-center">
                  {isActive ? (
                    <>
                      <Pause className="h-5 w-5" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5" />
                      <span>Start</span>
                    </>
                  )}
                </div>
              </Button>
            </div>
            <div className="text-center space-y-2">
              <p className="text-text-light text-xs md:text-sm font-medium">
                Completed: {pomodorosCompleted}
              </p>
              {/* Task status indicator */}
              {currentTaskName && (
                <div className="text-xs text-text-secondary">
                  {isActive ? (
                    <span className="text-green-500 font-medium">
                      ● In Progress
                    </span>
                  ) : (
                    <span className="text-yellow-500 font-medium">
                      ● Paused
                    </span>
                  )}
                </div>
              )}
              {/* Full task description for longer descriptions */}
              {currentTaskDescription && currentTaskDescription.length > 50 && (
                <div className="text-sm text-text-secondary mt-4 max-h-20 overflow-y-auto px-4">
                  <p className="font-semibold mb-1">Full Description:</p>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ node, children, ...props }) => (
                        <a
                          className="text-primary-DEFAULT underline hover:text-primary-dark"
                          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.preventDefault();
                            window.open(
                              (
                                props as React.AnchorHTMLAttributes<HTMLAnchorElement>
                              ).href,
                              "_blank"
                            );
                          }}
                        >
                          {children}
                        </a>
                      ),
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
