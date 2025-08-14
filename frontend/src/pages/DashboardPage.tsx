import React, { useState } from "react";
import { dayjs } from "../utils/dateUtils";
import CurrentTasks, { TaskCard } from "../components/CurrentTasks";
import PomodoroTimer from "../components/PomodoroTimer";
import { useTodayDailyPlan } from "../hooks/useDailyPlan";
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
  const { currentTaskId, setIsActive, isActive } = useTimer();

  // Get the setCurrentTask function directly from the store
  const setCurrentTask = useTimerStore((state) => state.setCurrentTask);
  const { mutateAsync: updateTask } = useUpdateTask();

  const { data: dailyPlan, isLoading, isError } = useTodayDailyPlan();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

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
        try {
          // If there's a current task in progress, set it to pending first
          if (currentTaskId) {
            await updateTask({
              taskId: currentTaskId,
              taskData: { status: "pending" },
            });
          }

          setCurrentTask(taskId, taskToStart.title, taskToStart.description);

          await updateTask({
            taskId: taskId,
            taskData: { status: "in_progress" },
          });
          if (!isActive) {
            setIsActive(true);
          }
        } catch (error) {
          console.error("Failed to start task:", error);
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
                  ) : isError ? (
                    <p className="text-red-500">Error loading daily plan.</p>
                  ) : (
                    <CurrentTasks
                      dailyPlan={dailyPlan}
                      onSelectTask={activateAndStartTask}
                    />
                  )}
                </div>
              </aside>
            </div>
          </div>
          <DragOverlay>
            {activeTask ? (
              <TaskCard task={activeTask} onSelectTask={() => {}} />
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>
    </div>
  );
};

export default DashboardPage;
