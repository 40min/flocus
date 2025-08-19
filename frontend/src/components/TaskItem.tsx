import React from "react";
import { Task as TaskType, TaskStatus } from "types/task";
import { cn, formatWorkingTime } from "../utils/utils";
import { useOptimisticTaskUpdate } from "../hooks/useOptimisticTaskUpdate";
import { Loader2, AlertCircle, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TaskItemProps {
  task: TaskType;
  baseBgColor: string;
  baseBorderColor: string;
  baseTextColor: string;
  hoverBgColor: string;
  hoverBorderColor: string;
  hoverShadowColor: string;
  showWorkingTime?: boolean;
  showActions?: boolean;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
  onWorkingTimeChange?: (taskId: string, additionalMinutes: number) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  baseBgColor,
  baseBorderColor,
  baseTextColor,
  hoverBgColor,
  hoverBorderColor,
  hoverShadowColor,
  showWorkingTime = false,
  showActions = false,
  onStatusChange,
  onWorkingTimeChange,
}) => {
  const { updateWorkingTime, updateStatus } = useOptimisticTaskUpdate();

  // Check if any mutations are pending for this task
  const isStatusPending = updateStatus.isPending &&
    updateStatus.variables?.taskId === task.id;
  const isWorkingTimePending = updateWorkingTime.isPending &&
    updateWorkingTime.variables?.taskId === task.id;
  const isPending = isStatusPending || isWorkingTimePending;

  // Check for errors
  const hasStatusError = updateStatus.isError &&
    updateStatus.variables?.taskId === task.id;
  const hasWorkingTimeError = updateWorkingTime.isError &&
    updateWorkingTime.variables?.taskId === task.id;
  const hasError = hasStatusError || hasWorkingTimeError;

  // Get optimistic status if status update is pending
  const displayStatus = isStatusPending && updateStatus.variables?.status
    ? updateStatus.variables.status
    : task.status;

  // Get optimistic working time if working time update is pending
  const displayWorkingTime = isWorkingTimePending && updateWorkingTime.variables?.additionalMinutes
    ? (task.statistics?.lasts_minutes || 0) + updateWorkingTime.variables.additionalMinutes
    : task.statistics?.lasts_minutes || 0;

  const handleRetry = () => {
    if (hasStatusError && updateStatus.variables) {
      updateStatus.mutate(updateStatus.variables);
    } else if (hasWorkingTimeError && updateWorkingTime.variables) {
      updateWorkingTime.mutate(updateWorkingTime.variables);
    }
  };

  const handleDismissError = () => {
    if (hasStatusError) {
      updateStatus.reset();
    } else if (hasWorkingTimeError) {
      updateWorkingTime.reset();
    }
  };

  const handleStatusClick = (newStatus: TaskStatus) => {
    if (onStatusChange) {
      onStatusChange(task.id, newStatus);
    } else {
      updateStatus.mutate({ taskId: task.id, status: newStatus });
    }
  };

  const handleAddTime = (minutes: number) => {
    if (onWorkingTimeChange) {
      onWorkingTimeChange(task.id, minutes);
    } else {
      updateWorkingTime.mutate({ taskId: task.id, additionalMinutes: minutes });
    }
  };

  const taskItemClasses = cn(
    "inline-flex items-center px-3 py-2 rounded-full border text-sm font-medium",
    "cursor-default relative",
    "transition-all duration-200 ease-out focus:outline-none",
    "select-none shadow-sm hover:shadow-md",
    // Apply opacity during pending states
    isPending && "opacity-60",
    // Apply different styling for error states
    hasError && "border-red-300 bg-red-50",
    // Normal styling when no error
    !hasError && baseBgColor,
    !hasError && baseBorderColor,
    !hasError && baseTextColor,
    !hasError && hoverBgColor,
    !hasError && hoverBorderColor,
    !hasError && hoverShadowColor
  );

  return (
    <div className="inline-flex items-center gap-2">
      <span className={taskItemClasses} aria-label={`Task: ${task.title}`}>
        {/* Loading spinner */}
        {isPending && (
          <Loader2
            className="w-4 h-4 animate-spin mr-1"
            aria-label="Updating task"
          />
        )}

        {/* Error icon */}
        {hasError && !isPending && (
          <AlertCircle
            className="w-4 h-4 text-red-500 mr-1"
            aria-label="Update failed"
          />
        )}

        {/* Task title */}
        <span className="truncate max-w-[200px] md:max-w-[300px]">
          {task.title}
        </span>

        {/* Status indicator */}
        {displayStatus !== task.status && (
          <span className="ml-1 text-xs opacity-60">
            → {displayStatus}
          </span>
        )}

        {/* Working time display */}
        {showWorkingTime && (
          <span className="ml-2 text-xs opacity-75">
            {formatWorkingTime(displayWorkingTime)}
          </span>
        )}
      </span>

      {/* Error actions */}
      {hasError && !isPending && (
        <div className="inline-flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRetry}
            className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-100"
            aria-label="Retry failed update"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismissError}
            className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-100"
            aria-label="Dismiss error"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Optional action buttons */}
      {showActions && !hasError && !isPending && (
        <div className="inline-flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleStatusClick(task.status === 'pending' ? 'in_progress' : 'pending')}
            className="h-6 px-2 text-xs"
          >
            {task.status === 'pending' ? 'Start' : 'Stop'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAddTime(15)}
            className="h-6 px-2 text-xs"
          >
            +15m
          </Button>
        </div>
      )}
    </div>
  );
};

export default TaskItem;
