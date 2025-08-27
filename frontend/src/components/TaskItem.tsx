import React, { useEffect } from "react";
import { Task as TaskType, TaskStatus } from "types/task";
import { cn, formatWorkingTime } from "../utils/utils";
import { useSuccessHighlight } from "../hooks/useSuccessHighlight";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { CheckCircle2 } from "lucide-react";
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
  const { isHighlighted, triggerHighlight } = useSuccessHighlight();
  const prefersReducedMotion = useReducedMotion();

  // Display values from server data
  const displayStatus = task.status;
  const displayWorkingTime = task.statistics?.lasts_minutes || 0;

  // Simplified handlers using standard API calls
  const handleRetry = () => {
    // Retry logic will be handled by parent components
  };

  const handleDismissError = () => {
    // Error dismissal will be handled by parent components
  };

  const handleStatusClick = (newStatus: TaskStatus) => {
    if (onStatusChange) {
      onStatusChange(task.id, newStatus);
    }
  };

  const handleAddTime = (minutes: number) => {
    if (onWorkingTimeChange) {
      onWorkingTimeChange(task.id, minutes);
    }
  };

  const taskItemClasses = cn(
    "inline-flex items-center px-3 py-2 rounded-full border text-sm font-medium",
    "cursor-default relative",
    "transition-all duration-300 ease-out focus:outline-none",
    "select-none shadow-sm hover:shadow-md",
    // Success highlight with green glow
    isHighlighted && [
      "ring-2 ring-green-400 ring-opacity-75 bg-green-50 border-green-300",
      !prefersReducedMotion && "animate-pulse",
    ],
    // Normal styling when not highlighted
    !isHighlighted && baseBgColor,
    !isHighlighted && baseBorderColor,
    !isHighlighted && baseTextColor,
    !isHighlighted && hoverBgColor,
    !isHighlighted && hoverBorderColor,
    !isHighlighted && hoverShadowColor,
    // Add subtle hover animation for interactive feedback (only if motion is allowed)
    !prefersReducedMotion && "hover:scale-[1.02] active:scale-[0.98]"
  );

  return (
    <div className="inline-flex items-center gap-2">
      <span className={taskItemClasses} aria-label={`Task: ${task.title}`}>
        {/* Success checkmark */}
        {isHighlighted && (
          <CheckCircle2
            className="w-4 h-4 text-green-600 mr-1 animate-in fade-in duration-200"
            aria-label="Update successful"
          />
        )}

        {/* Task title */}
        <span className="truncate max-w-[200px] md:max-w-[300px]">
          {task.title}
        </span>

        {/* Working time display */}
        {showWorkingTime && (
          <span
            className={cn(
              "ml-2 text-xs transition-all duration-300 ease-out opacity-75",
              isHighlighted && "text-green-700 font-medium"
            )}
          >
            {formatWorkingTime(displayWorkingTime)}
          </span>
        )}
      </span>

      {/* Optional action buttons */}
      {showActions && (
        <div className="inline-flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              handleStatusClick(
                task.status === "pending" ? "in_progress" : "pending"
              )
            }
            className="h-6 px-2 text-xs"
          >
            {task.status === "pending" ? "Start" : "Stop"}
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
