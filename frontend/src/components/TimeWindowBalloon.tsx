import React, { forwardRef, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { TimeWindow as TimeWindowType } from "types/timeWindow";
import type { Task as TaskType } from "types/task";
import {
  cn,
  formatMinutesToHHMM,
  formatDurationFromMinutes,
} from "../utils/utils";
import { Button } from "@/components/ui/button";
import {
  Clock,
  XCircle,
  PlusCircle,
  Edit3,
  ArrowRight,
  MoreHorizontal,
} from "lucide-react";
import AssignedTaskBalloon from "./AssignedTaskBalloon";
import TaskPicker from "./TaskPicker";
import DateSelectionModal from "./modals/DateSelectionModal";
import { useTimer } from "../hooks/useTimer";
import { carryOverTimeWindow } from "../services/dailyPlanService";
import { useMessage } from "../context/MessageContext";

interface CarryOverStatus {
  canCarryOver: boolean;
  taskCount: number;
  hasActiveTimer: boolean;
  affectedTasks: TaskType[];
}

interface TimeWindowBalloonProps extends React.HTMLAttributes<HTMLDivElement> {
  timeWindow: TimeWindowType;
  tasks?: TaskType[];
  onDelete?: (timeWindowId: string) => void;
  onEdit?: () => void;
  onAssignTask?: (task: TaskType) => void;
  onUnassignTask?: (taskId: string) => void;
  onCarryOver?: (timeWindowId: string, targetDate: string) => void;
  isOverlay?: boolean;
  dragListeners?: any;
  dailyPlanId?: string;
  carryOverStatus?: CarryOverStatus;
  isCarryingOver?: boolean;
}

const getTextColor = (bgColor: string): string => {
  if (!bgColor) return "text-slate-900"; // Default text color

  // Convert hex to RGB
  let r = 0,
    g = 0,
    b = 0;
  if (bgColor.length === 7) {
    // #RRGGBB
    r = parseInt(bgColor.slice(1, 3), 16);
    g = parseInt(bgColor.slice(3, 5), 16);
    b = parseInt(bgColor.slice(5, 7), 16);
  } else if (bgColor.length === 4) {
    // #RGB
    r = parseInt(bgColor[1] + bgColor[1], 16);
    g = parseInt(bgColor[2] + bgColor[2], 16);
    b = parseInt(bgColor[3] + bgColor[3], 16);
  }

  // Calculate luminance (perceived brightness)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Use a threshold to determine text color
  return luminance > 0.3 ? "text-slate-900" : "text-white";
};

const TimeWindowBalloon = forwardRef<HTMLDivElement, TimeWindowBalloonProps>(
  (
    {
      timeWindow,
      tasks = [],
      onDelete,
      onEdit,
      onAssignTask,
      onUnassignTask,
      onCarryOver,
      isOverlay,
      dragListeners,
      dailyPlanId,
      carryOverStatus,
      isCarryingOver = false,
      ...props
    },
    ref
  ) => {
    const { currentTaskId, stopCurrentTask } = useTimer();
    const { showMessage } = useMessage();
    const [isTaskPickerOpen, setIsTaskPickerOpen] = useState(false);
    const [isDateSelectionOpen, setIsDateSelectionOpen] = useState(false);
    const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
    const actionsMenuRef = useRef<HTMLDivElement>(null);

    // Close actions menu when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          actionsMenuRef.current &&
          !actionsMenuRef.current.contains(event.target as Node)
        ) {
          setIsActionsMenuOpen(false);
        }
      };

      if (isActionsMenuOpen) {
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
          document.removeEventListener("mousedown", handleClickOutside);
      }
    }, [isActionsMenuOpen]);

    const { id, description, start_time, end_time, category } = timeWindow;
    const categoryColor = category?.color || "#A0AEC0"; // Default to a neutral gray
    const lightBgColor = categoryColor + "20"; // Add 20 for ~12% opacity in hex

    const textColorClass = getTextColor(categoryColor);

    const formattedStartTime = formatMinutesToHHMM(start_time);
    const formattedEndTime = formatMinutesToHHMM(end_time);
    const durationMinutes = end_time - start_time;
    const formattedDuration = formatDurationFromMinutes(durationMinutes);

    const mainDivClasses = cn(
      "relative rounded-t-[2rem] rounded-b-[1.5rem] border-2 p-4 md:p-6 shadow-lg backdrop-blur-sm transition-all duration-300 max-w-lg touch-none",
      isOverlay ? "scale-100" : "scale-80 ml-0",
      "hover:shadow-xl"
    );

    const handleDelete = () => {
      if (onDelete) {
        const assignedTask = tasks.find((task) => task.id === currentTaskId);
        if (assignedTask) {
          stopCurrentTask();
        }
        onDelete(id);
      }
    };

    const handleCarryOverConfirm = async (targetDate: string) => {
      if (!dailyPlanId) {
        showMessage("Cannot carry over: Daily plan ID not available", "error");
        return;
      }

      try {
        if (onCarryOver) {
          // Pass the original time window ID, let the integration hook handle the stable ID generation
          await onCarryOver(id, targetDate);
        } else {
          // Fallback to direct API call if no handler provided
          // Generate stable identifier that matches backend expectation
          const stableId = `${category.id}_${start_time}_${end_time}`;
          await carryOverTimeWindow({
            source_plan_id: dailyPlanId,
            time_window_id: stableId,
            target_date: targetDate,
          });
          showMessage("Time window carried over successfully!", "success");
        }
      } catch (error) {
        console.error("Failed to carry over time window:", error);
        showMessage("Failed to carry over time window", "error");
      }
    };

    return (
      <article
        ref={ref}
        {...props}
        className="relative group"
        aria-label={`Time window: ${category.name} from ${formattedStartTime} to ${formattedEndTime}, duration ${formattedDuration}`}
      >
        <div
          className={mainDivClasses}
          style={{ borderColor: categoryColor, backgroundColor: lightBgColor }}
        >
          <header className="mb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 cursor-move" {...(dragListeners || {})}>
                <h4
                  className={cn(
                    "text-base md:text-lg font-bold",
                    textColorClass
                  )}
                >
                  {category.name}
                </h4>
                {description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {description}
                  </p>
                )}
              </div>
              <div className="flex items-center relative" ref={actionsMenuRef}>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsActionsMenuOpen(!isActionsMenuOpen);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  variant="ghost"
                  size="icon"
                  aria-label="Time window actions"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </Button>

                {isActionsMenuOpen && (
                  <div className="absolute top-full right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 min-w-[160px]">
                    {onEdit && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit();
                          setIsActionsMenuOpen(false);
                        }}
                        variant="ghost"
                        className="w-full justify-start text-left px-3 py-2 text-sm hover:bg-slate-50"
                        aria-label="Edit time window"
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    )}
                    {(onCarryOver || dailyPlanId) &&
                      carryOverStatus?.canCarryOver && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsDateSelectionOpen(true);
                            setIsActionsMenuOpen(false);
                          }}
                          variant="ghost"
                          className="w-full justify-start text-left px-3 py-2 text-sm hover:bg-slate-50"
                          disabled={isCarryingOver}
                        >
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Carry Over ({carryOverStatus.taskCount} task
                          {carryOverStatus.taskCount !== 1 ? "s" : ""})
                          {carryOverStatus.hasActiveTimer && (
                            <span className="ml-1 text-xs text-amber-600">
                              ⏱
                            </span>
                          )}
                        </Button>
                      )}
                    {onDelete && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete();
                          setIsActionsMenuOpen(false);
                        }}
                        variant="ghost"
                        className="w-full justify-start text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600"
                        aria-label="Delete time window"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between text-sm md:text-base mt-2">
              <div className="flex items-center gap-4">
                <time
                  dateTime={`${formattedStartTime}/${formattedEndTime}`}
                  className={cn(
                    "flex items-center gap-1 text-sm",
                    textColorClass
                  )}
                  aria-label={`Time from ${formattedStartTime} to ${formattedEndTime}`}
                >
                  <Clock className="h-3 w-3" />
                  <span className={cn("text-sm", textColorClass)}>
                    {formattedStartTime} - {formattedEndTime}
                  </span>
                </time>
                <span
                  className={cn(
                    "px-2 py-1 rounded-full text-xs font-small",
                    textColorClass
                  )}
                  style={{ backgroundColor: categoryColor + "33" }}
                  aria-label={`Duration: ${formattedDuration}`}
                >
                  {formattedDuration}
                </span>
              </div>
            </div>
          </header>
          <section>
            <h3 className="sr-only">Tasks for this time window</h3>
            <div
              className="mt-4 flex flex-wrap gap-2"
              aria-label="Tasks assigned to this time window"
            >
              {tasks &&
                tasks.length > 0 &&
                tasks.map((task) => (
                  <AssignedTaskBalloon
                    key={task.id}
                    task={task}
                    {...(onUnassignTask && { onUnassign: onUnassignTask })}
                  />
                ))}
              {onAssignTask && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsTaskPickerOpen(true);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  variant="secondary"
                  size="icon"
                  className="w-8 h-8 rounded-full hover:text-blue-600"
                  aria-label="Assign task"
                >
                  <PlusCircle className="h-5 w-5" />
                </Button>
              )}
            </div>
          </section>
          {isTaskPickerOpen &&
            onAssignTask &&
            createPortal(
              <TaskPicker
                categoryId={category.id}
                assignedTaskIds={tasks.map((t) => t.id)}
                onSelectTask={(task) => {
                  onAssignTask(task);
                  setIsTaskPickerOpen(false);
                }}
                onClose={() => setIsTaskPickerOpen(false)}
              />,
              document.body
            )}

          <DateSelectionModal
            isOpen={isDateSelectionOpen}
            onClose={() => setIsDateSelectionOpen(false)}
            onConfirm={handleCarryOverConfirm}
            title="Carry Over Time Window"
            description={
              carryOverStatus
                ? `Carry over "${category.name}" time window with ${
                    carryOverStatus.taskCount
                  } unfinished task${
                    carryOverStatus.taskCount !== 1 ? "s" : ""
                  } to a future date:${
                    carryOverStatus.hasActiveTimer
                      ? " (Active timer will be stopped)"
                      : ""
                  }`
                : `Carry over "${category.name}" time window to a future date:`
            }
          />
        </div>
      </article>
    );
  }
);

export default TimeWindowBalloon;
