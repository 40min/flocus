import React, { useState, useEffect } from "react";
import { dayjs } from "../utils/dateUtils";
import CurrentTasks, { TaskCard } from "../components/CurrentTasks";
import PomodoroTimer from "../components/PomodoroTimer";
import { useTodayDailyPlan, useDailyPlanWithReview } from "../hooks/useDailyPlan";
import { useNavigate } from "react-router-dom";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import { useTimer } from "../hooks/useTimer";
import { useTimerStore } from "../stores/timerStore";
import { useUpdateTask } from "../hooks/useTasks";
import { Task } from "types/task";
import DailyStats from "components/DailyStats";

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentTaskId, setIsActive, isActive } = useTimer();

  // Get the setCurrentTask function directly from the store
  const setCurrentTask = useTimerStore((state) => state.setCurrentTask);

  // Use standard API calls for task updates
  const { mutate: updateTaskMutation, isPending: isUpdatingTask } =
    useUpdateTask();

  // Use the enhanced hook with reviewed flag handling
  const {
    dailyPlan,
    isLoading,
    error,
    needsReview,
    reviewMode
  } = useDailyPlanWithReview();

  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Redirect to MyDay page if plan needs review
  useEffect(() => {
    if (!isLoading && needsReview) {
      navigate('/my-day', {
        state: {
          message: 'Your daily plan needs to be reviewed and approved before you can access the dashboard.',
          from: 'dashboard'
        }
      });
    }
  }, [needsReview, isLoading, navigate]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (dailyPlan) {
      for (const timeWindow of dailyPlan.time_windows) {
        const task = timeWindow.tasks.find((t) => t.id === active.id);
        if (task) {
          setActiveTask(task);
          break;
        }
      }
    }
  };

  const activateAndStartTask = async (taskId: string) => {
    if (taskId === currentTaskId) {
      return;
    }

    if (dailyPlan) {
      let taskToStart;
      for (const timeWindow of dailyPlan.time_windows) {
        const foundTask = timeWindow.tasks.find((task) => task.id === taskId);
        if (foundTask) {
          taskToStart = foundTask;
          break;
        }
      }

      if (taskToStart) {
        // Stop current task if one is active
        if (currentTaskId && currentTaskId !== taskId) {
          updateTaskMutation({
            taskId: currentTaskId,
            taskData: { status: "pending" },
          });
        }

        // Set the new task in the timer
        setCurrentTask(taskId, taskToStart.title, taskToStart.description);

        // Start the new task via API call
        updateTaskMutation({
          taskId: taskId,
          taskData: { status: "in_progress" },
        });

        // Start the timer if not already active
        if (!isActive) {
          setIsActive(true);
        }
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const taskId = event.active.id as string;

    if (event.over?.id === "pomodoro-drop-zone") {
      await activateAndStartTask(taskId);
    }
    setActiveTask(null);
  };

  return (
    <div className=" min-h-screen">
      <header className="w-full px-6 py-8 md:px-12 md:py-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-esteban italic font-semibold text-text-DEFAULT flex items-center gap-2">
            {dayjs().format("dddd, MMMM Do")}
          </h1>
          <DailyStats />
        </div>
      </header>
      <main className="flex-1 px-6 md:px-12 pb-12">
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              <section className="lg:col-span-7 xl:col-span-8 flex justify-center">
                <div className="w-full max-w-lg">
                  <PomodoroTimer />
                </div>
              </section>
              <aside className="lg:col-span-5 xl:col-span-4">
                <div className="sticky top-8 h-[450px] flex flex-col">
                  {isLoading ? (
                    <p className="text-white">Loading daily plan...</p>
                  ) : error ? (
                    <p className="text-red-500">Error loading daily plan.</p>
                  ) : needsReview ? (
                    <div className="text-center py-8">
                      <p className="text-yellow-400 mb-2">Plan Review Required</p>
                      <p className="text-text-secondary text-sm">
                        Redirecting to review your daily plan...
                      </p>
                    </div>
                  ) : (
                    <CurrentTasks
                      dailyPlan={dailyPlan}
                      onSelectTask={activateAndStartTask}
                      isUpdatingTask={isUpdatingTask}
                      isPlanReviewed={!needsReview}
                    />
                  )}
                </div>
              </aside>
            </div>
          </div>
          <DragOverlay>
            {activeTask ? (
              <TaskCard
                task={activeTask}
                onSelectTask={() => {}}
                onEditTask={() => {}}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>
    </div>
  );
};

export default DashboardPage;
