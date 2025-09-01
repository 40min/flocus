import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useDraggable } from "@dnd-kit/core";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import {
  CheckCircle,
  Clock,
  Edit,
  GripVertical,
  Pause,
  Play,
  Trash2,
} from "lucide-react";
import { useCurrentTimeWindow } from "../hooks/useCurrentTimeWindow";
import { Task, TaskCreateRequest } from "types/task";
import { DailyPlanResponse } from "../types/dailyPlan";
import { cn, formatWorkingTime } from "../utils/utils";
import { useTimer } from "../hooks/useTimer";
import { useDeleteTask, useUpdateTask } from "hooks/useTasks";
import { useCategories } from "hooks/useCategories";
import { Button } from "@/components/ui/button";
import CreateTaskModal from "./modals/CreateTaskModal";
import { useTaskModal } from "../hooks/useTaskModal";

export const TaskCard = ({
  task,
  onSelectTask,
  onEditTask,
  isUpdatingFromParent = false,
}: {
  task: Task;
  onSelectTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  isUpdatingFromParent?: boolean;
}) => {
  const {
    currentTaskId,
    isActive,
    handleStartPause,
    stopCurrentTask,
    handleMarkAsDone,
  } = useTimer();

  const { mutate: deleteTask, isPending: isDeleting } = useDeleteTask();
  const {
    mutate: updateTask,
    isPending: isUpdating,
    isError: isUpdateError,
    error: updateError,
  } = useUpdateTask();
  const isSelectedTask = currentTaskId === task.id;

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
      disabled: isSelectedTask,
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const priorityClasses = {
    high: "bg-red-500/10 text-red-600 border-red-500/30",
    medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
    low: "bg-accent-DEFAULT/10 text-accent-dark border-accent-DEFAULT/30",
  };
  const priority = task.priority.toLowerCase() as "high" | "medium" | "low";

  const handleDelete = async () => {
    if (
      window.confirm(
        `Are you sure you want to delete the task "${task.title}"?`
      )
    ) {
      if (currentTaskId === task.id) {
        await stopCurrentTask();
      }
      deleteTask(task.id);
    }
  };

  const handleMarkTaskAsDone = () => {
    updateTask({ taskId: task.id, taskData: { status: "done" } });
  };

  const handleRetryUpdate = () => {
    // Retry the last failed update - in this case, mark as done
    updateTask({ taskId: task.id, taskData: { status: "done" } });
  };

  return (
    <li className="list-none" ref={setNodeRef} style={style}>
      <div
        className={cn(
          "transition-all duration-200",
          isDragging && "opacity-50 shadow-2xl z-50 relative",
          isSelectedTask ? "cursor-not-allowed opacity-100" : "opacity-75",
          (isUpdating || isDeleting || isUpdatingFromParent) &&
            "opacity-75 pointer-events-none"
        )}
        tabIndex={0}
      >
        <div
          className="bg-background-card text-text-DEFAULT flex flex-col gap-6 rounded-xl border py-6 shadow-sm hover:shadow-lg transition-all duration-300 border-border-DEFAULT hover:border-border-dark focus-within:ring-2 focus-within:ring-primary/20"
          aria-label={`Drag task: ${task.title}`}
        >
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div
                className="flex-shrink-0 mt-1 cursor-grab active:cursor-grabbing"
                {...listeners}
                {...attributes}
              >
                <GripVertical className="h-4 w-4 text-text-light" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-text-DEFAULT text-sm leading-tight">
                    {task.title}
                  </h3>
                  <span
                    className={`inline-flex items-center justify-center rounded-md border px-2 py-0.5 w-fit whitespace-nowrap shrink-0 text-xs font-medium flex-shrink-0 ${priorityClasses[priority]}`}
                  >
                    {priority}
                  </span>
                </div>
                <div className="text-xs text-text-secondary mb-3">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ node, children, ...props }) => (
                        <a
                          className="text-primary-DEFAULT underline hover:text-primary-dark"
                          target="_blank"
                          rel="noopener noreferrer"
                          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {task.description || ""}
                  </ReactMarkdown>
                </div>
                <div className="flex items-center gap-1 text-xs text-text-secondary">
                  <Clock className="h-3 w-3" />
                  <span>
                    {formatWorkingTime(task.statistics?.lasts_minutes)}
                  </span>
                  {(isUpdating || isUpdatingFromParent) && (
                    <div className="ml-2 flex items-center gap-1">
                      <div className="animate-spin h-3 w-3 border border-gray-300 border-t-blue-500 rounded-full"></div>
                      <span className="text-xs text-blue-600">
                        {isUpdatingFromParent ? "Switching..." : "Updating..."}
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Button
                    onClick={() => {
                      if (isSelectedTask) {
                        handleStartPause();
                      } else {
                        onSelectTask(task.id);
                      }
                    }}
                    disabled={isSelectedTask && isActive}
                    variant="ghost"
                    size="icon"
                    title="Start task"
                    className="disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={handleStartPause}
                    disabled={!isSelectedTask || !isActive}
                    variant="ghost"
                    size="icon"
                    title="Pause task"
                    className="disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Pause className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={handleMarkTaskAsDone}
                    disabled={task.status === "done" || isUpdating}
                    variant="ghost"
                    size="icon"
                    title="Mark as Done"
                    className="text-slate-400 hover:text-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => onEditTask(task)}
                    variant="ghost"
                    size="icon"
                    title="Edit task"
                    className="text-slate-400 hover:text-blue-500"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    variant="ghost"
                    size="icon"
                    title="Delete task"
                    className="text-slate-400 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Error state display */}
                {isUpdateError && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-red-600">
                        Update failed: {updateError?.message || "Unknown error"}
                      </span>
                      <Button
                        onClick={handleRetryUpdate}
                        variant="ghost"
                        size="sm"
                        className="text-xs text-red-600 hover:text-red-700 underline"
                      >
                        Retry
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
};

interface CurrentTasksProps {
  dailyPlan: DailyPlanResponse | null | undefined;
  onSelectTask: (taskId: string) => void;
  isUpdatingTask?: boolean;
  isPlanReviewed?: boolean;
}

const CurrentTasks: React.FC<CurrentTasksProps> = ({
  dailyPlan,
  onSelectTask,
  isUpdatingTask = false,
  isPlanReviewed = true,
}) => {
  const { currentTimeWindow, currentTasks } = useCurrentTimeWindow(
    dailyPlan || null
  );
  const [animationParent] = useAutoAnimate({
    duration: 250,
    easing: "ease-in-out",
  });

  const { data: categories } = useCategories();
  const {
    isModalOpen: isEditModalOpen,
    editingTask,
    openEditModal,
    closeModal,
    handleSubmitSuccess,
  } = useTaskModal({
    additionalQueryKeys: [["daily-plan"]],
  });

  const initialFormData: TaskCreateRequest = {
    title: "",
    description: "",
    status: "pending",
    priority: "medium",
    due_date: null,
    category_id: "",
  };

  return (
    <>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-text-DEFAULT bg-background-card p-2 rounded-md mb-2">
          Today's Tasks
        </h2>
      </div>
      <section className="w-full" aria-label="Task List">
        <div className="space-y-4">
          {!isPlanReviewed ? (
            <div className="text-center py-8">
              <p className="text-yellow-400 mb-2">Plan Review Required</p>
              <p className="text-text-secondary text-sm">
                Tasks will be available after your daily plan is reviewed and approved.
              </p>
            </div>
          ) : (
            <ul
              ref={animationParent}
              className="space-y-3 h-full overflow-y-auto pr-2 relative z-10"
            >
              {currentTimeWindow === null ? (
                <p className="text-text-secondary text-sm">
                  No works planned for this time.
                </p>
              ) : currentTasks.length === 0 ? (
                <p className="text-text-secondary text-sm">
                  No tasks for the current time window.
                </p>
              ) : (
                currentTasks
                  .filter(
                    (task) =>
                      task.status !== "done" &&
                      task.status !== "blocked" &&
                      !task.is_deleted
                  )
                  .map((task: Task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onSelectTask={onSelectTask}
                      onEditTask={openEditModal}
                      isUpdatingFromParent={isUpdatingTask}
                    />
                  ))
              )}
            </ul>
          )}
        </div>
      </section>

      <CreateTaskModal
        isOpen={isEditModalOpen}
        onClose={closeModal}
        onSubmitSuccess={handleSubmitSuccess}
        editingTask={editingTask}
        categories={categories || []}
        initialFormData={initialFormData}
      />
    </>
  );
};

export default CurrentTasks;
