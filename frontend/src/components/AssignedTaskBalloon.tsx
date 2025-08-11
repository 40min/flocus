import React from "react";
import { Task, TaskStatus } from "../types/task";
import { Button } from "@/components/ui/button";
import {
  MinusCircle,
  CheckCircle,
  LoaderCircle,
  XCircle,
  Circle,
} from "lucide-react";
import { cn } from "lib/utils";

interface AssignedTaskBalloonProps {
  task: Task;
  onUnassign?: (taskId: string) => void;
}

// Internal component for displaying task status icon
const TaskStatusIcon: React.FC<{ status: TaskStatus }> = ({ status }) => {
  const iconProps = {
    size: 16,
    className: "flex-shrink-0",
  };

  switch (status) {
    case "done":
      return (
        <CheckCircle
          {...iconProps}
          className={cn(iconProps.className, "text-green-500")}
        >
          <title>Done</title>
        </CheckCircle>
      );
    case "in_progress":
      return (
        <LoaderCircle
          {...iconProps}
          className={cn(iconProps.className, "text-blue-500 animate-spin")}
        >
          <title>In Progress</title>
        </LoaderCircle>
      );
    case "blocked":
      return (
        <XCircle
          {...iconProps}
          className={cn(iconProps.className, "text-red-500")}
        >
          <title>Blocked</title>
        </XCircle>
      );
    case "pending":
    default:
      return (
        <Circle
          {...iconProps}
          className={cn(iconProps.className, "text-slate-400")}
        >
          <title>Pending</title>
        </Circle>
      );
  }
};

const AssignedTaskBalloon: React.FC<AssignedTaskBalloonProps> = ({
  task,
  onUnassign,
}) => {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-800 border border-slate-200">
      <TaskStatusIcon status={task.status} />
      <span className="truncate max-w-[150px]">{task.title}</span>
      {onUnassign && (
        <Button
          onClick={() => onUnassign(task.id)}
          variant="ghost"
          size="icon"
          className="!p-0 h-auto text-slate-500 hover:text-red-600 focus:outline-none"
          aria-label={`Unassign task: ${task.title}`}
        >
          <MinusCircle className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default AssignedTaskBalloon;
