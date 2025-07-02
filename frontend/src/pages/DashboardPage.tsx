import React from 'react';
import { format } from 'date-fns';
import CurrentTasks from '../components/CurrentTasks';
import PomodoroTimer from '../components/PomodoroTimer';
import { useTodayDailyPlan } from '../hooks/useDailyPlan';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { useSharedTimerContext } from '../context/SharedTimerContext';
import { useUpdateTask } from '../hooks/useTasks';

const DashboardPage: React.FC = () => {
  const { setCurrentTaskId, setCurrentTaskName, setCurrentTaskDescription, resetForNewTask, currentTaskId, setIsActive } = useSharedTimerContext();
  const { mutateAsync: updateTask } = useUpdateTask();

  const { data: dailyPlan, isLoading, isError } = useTodayDailyPlan();

  const activateAndStartTask = async (taskId: string) => {
    if (taskId === currentTaskId) {
      return;
    }

    if (dailyPlan) {
      let taskToStart;
      for (const timeWindow of dailyPlan.time_windows) {
        const foundTask = timeWindow.tasks.find(task => task.id === taskId);
        if (foundTask) {
          taskToStart = foundTask;
          break;
        }
      }

      if (taskToStart) {
        try {
          await resetForNewTask();
          setCurrentTaskId(taskId);
          setCurrentTaskName(taskToStart.title);
          setCurrentTaskDescription(taskToStart.description);

          await updateTask({ taskId: taskId, taskData: { status: 'in_progress' } });
          setIsActive(true);
        } catch (error) {
          console.error('Failed to start task:', error);
        }
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const taskId = event.active.id as string;

    if (event.over?.id === 'pomodoro-drop-zone') {
      await activateAndStartTask(taskId);
    }
  };

  return (
    <div className=" min-h-screen">
      <header className="w-full px-6 py-8 md:px-12 md:py-12">
        <div className="flex items-center justify-center md:justify-start">
          <h1 className="text-2xl md:text-3xl font-esteban italic font-semibold text-text-DEFAULT flex items-center gap-2">
{format(new Date(), 'EEEE, MMMM do')}

          </h1>
        </div>
      </header>
      <main className="flex-1 px-6 md:px-12 pb-12">
        <DndContext onDragEnd={handleDragEnd}>
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
                    <CurrentTasks dailyPlan={dailyPlan} onSelectTask={activateAndStartTask} />
                  )}
                </div>
              </aside>
            </div>
          </div>
        </DndContext>
      </main>
    </div>
  );
};

export default DashboardPage;
