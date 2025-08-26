import React from "react";
import { Play, Pause, RotateCcw, SkipForward } from "lucide-react";
import { cn } from "../utils/utils";
import { useDroppable } from "@dnd-kit/core";
import { useTimer } from "../hooks/useTimer";
import { useOptimisticTaskUpdate } from "../hooks/useOptimisticTaskUpdate";
import { useEffect } from "react";
import { useTimerButtonStates, useTimerModeText } from "../stores/timerStore";
import { Button } from "@/components/ui/button";
import { CircularProgress } from "@/components/ui";
const PomodoroTimer: React.FC = () => {
  const {
    mode,
    timeRemaining,
    isActive,
    handleStartPause,
    handleReset,
    handleSkip,
    formatTime,
    isBreak,
    timerColor,
    currentTaskName,
    currentTaskDescription,
    setOptimisticUpdateFunctions,
  } = useTimer();

  // Use optimistic updates with graceful fallback
  let isUpdatingStatus = false;
  let isUpdatingWorkingTime = false;
  let updateStatus: any = null;
  let updateWorkingTime: any = null;

  // Always call hooks, but handle errors gracefully
  try {
    const optimisticHooks = useOptimisticTaskUpdate();
    updateStatus = optimisticHooks.updateStatus;
    updateWorkingTime = optimisticHooks.updateWorkingTime;
    isUpdatingStatus = updateStatus.isPending;
    isUpdatingWorkingTime = updateWorkingTime.isPending;
  } catch (error) {
    // Graceful fallback when QueryClient is not available (e.g., in tests)
    console.debug(
      "Optimistic updates not available, falling back to basic timer functionality"
    );
  }

  // Connect optimistic update functions to the timer store
  useEffect(() => {
    if (updateStatus && updateWorkingTime && setOptimisticUpdateFunctions) {
      const optimisticUpdateStatus = (taskId: string, status: any) => {
        updateStatus.mutate({ taskId, status });
      };

      const optimisticUpdateWorkingTime = (
        taskId: string,
        additionalMinutes: number
      ) => {
        updateWorkingTime.mutate({ taskId, additionalMinutes });
      };

      setOptimisticUpdateFunctions(
        optimisticUpdateStatus,
        optimisticUpdateWorkingTime
      );
    }
  }, [updateStatus, updateWorkingTime, setOptimisticUpdateFunctions]);

  // Get button states and mode text from the timer store selectors
  const { resetDisabled, skipBreakVisible } = useTimerButtonStates();
  const modeText = useTimerModeText();

  // Helper function to get session duration based on mode
  const getSessionDuration = (currentMode: string): number => {
    switch (currentMode) {
      case "work":
        return 25 * 60; // 25 minutes in seconds
      case "shortBreak":
        return 5 * 60; // 5 minutes in seconds
      case "longBreak":
        return 15 * 60; // 15 minutes in seconds
      default:
        return 25 * 60; // Default to work session
    }
  };

  // Calculate progress for circular progress counter (0-1 range)
  // Progress shows elapsed time in current session
  const currentSessionDuration = getSessionDuration(mode);
  const progressValue = React.useMemo(() => {
    if (
      !mode ||
      typeof timeRemaining !== "number" ||
      isNaN(timeRemaining) ||
      currentSessionDuration <= 0
    ) {
      return 0;
    }
    return Math.max(
      0,
      Math.min(
        1,
        (currentSessionDuration - timeRemaining) / currentSessionDuration
      )
    );
  }, [mode, timeRemaining, currentSessionDuration]);

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
                <div className="relative flex items-center justify-center">
                  {/* Circular progress counter positioned behind the timer */}
                  <CircularProgress
                    progress={progressValue}
                    size={304} // Slightly larger than timer (288px + padding)
                    strokeWidth={6}
                    className="absolute"
                  />

                  {/* Timer circle */}
                  <div
                    ref={setNodeRef}
                    className={cn(
                      "relative w-60 h-60 md:w-72 md:h-72 rounded-full bg-background-card border-2 shadow-lg transition-all duration-300 flex items-center justify-center z-10",
                      timerColor,
                      isOver &&
                        "border-primary-light ring-4 ring-primary-light/20",
                      (isUpdatingStatus || isUpdatingWorkingTime) &&
                        "opacity-75"
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
                          <div className="text-5xl md:text-6xl font-bold font-mono text-text-DEFAULT">
                            {formatTime(timeRemaining)}
                          </div>

                          {/* Mode indicator - less visible, under timer counter */}
                          {(isActive || currentTaskName) && modeText && (
                            <div className="mt-2">
                              <p className="text-xs text-text-secondary/60 font-normal">
                                {modeText}
                              </p>
                            </div>
                          )}

                          {/* Optimistic update indicators */}
                          {(isUpdatingStatus || isUpdatingWorkingTime) && (
                            <div className="mt-1">
                              <p className="text-xs text-blue-500 font-normal flex items-center justify-center gap-1">
                                <span className="animate-spin h-3 w-3 border border-blue-500 border-t-transparent rounded-full"></span>
                                {isUpdatingStatus && "Updating status..."}
                                {isUpdatingWorkingTime && "Updating time..."}
                              </p>
                            </div>
                          )}

                          {/* Show task status when no task is selected */}
                          {!currentTaskName && (
                            <p className="text-sm text-text-secondary mt-2">
                              Drag a task here to start focusing
                            </p>
                          )}
                        </>
                      )}

                      {/* Button row: Reset - Start/Stop - Skip */}
                      <div className="flex items-center justify-between w-full max-w-xs mt-4 px-4">
                        <Button
                          onClick={handleReset}
                          variant="secondary"
                          size="icon"
                          aria-label="Reset timer"
                          className={cn(
                            "flex-shrink-0",
                            // Override default disabled opacity to make button more visible
                            resetDisabled && "disabled:opacity-75"
                          )}
                          disabled={resetDisabled}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>

                        <Button
                          onClick={handleStartPause}
                          variant={isActive ? "destructive" : "default"}
                          size="default"
                          className={cn(
                            "rounded-full transition-all duration-200 w-12 h-12 flex-shrink-0",
                            isActive
                              ? "bg-red-300 hover:bg-red-600 text-white"
                              : "bg-green-300 hover:bg-green-600 text-white"
                          )}
                          aria-label={isActive ? "Pause timer" : "Start timer"}
                          disabled={
                            !currentTaskName && !isActive // Only disable if no task selected and not active
                          }
                        >
                          {isActive ? (
                            <Pause className="h-6 w-6" />
                          ) : (
                            <Play className="h-6 w-6" />
                          )}
                        </Button>

                        {/* Conditionally render Skip Break button based on timer mode */}
                        {skipBreakVisible ? (
                          <Button
                            onClick={handleSkip}
                            variant="secondary"
                            size="icon"
                            aria-label="Skip break"
                            className="flex-shrink-0"
                          >
                            <SkipForward className="h-4 w-4" />
                          </Button>
                        ) : (
                          // Placeholder to maintain button layout spacing
                          <div className="w-10 h-10 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </figure>
            </div>

            {/* Current task display */}
            {currentTaskName && (
              <div className="text-center">
                <p className="text-sm text-text-secondary">
                  <span className="font-bold">Task:</span>{" "}
                  <span className="text-text-DEFAULT">{currentTaskName}</span>
                  {currentTaskDescription && (
                    <span className="text-text-secondary">
                      {" "}
                      ({currentTaskDescription})
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PomodoroTimer;
