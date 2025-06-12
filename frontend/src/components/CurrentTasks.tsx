import React from 'react';
import { Clock, GripVertical } from 'lucide-react';
import { useCurrentTimeWindow } from '../hooks/useCurrentTimeWindow';
import { Task } from '../types/task';
import { useTodayDailyPlan } from '../hooks/useDailyPlan';

const TaskCard = ({ title, priority, description }: { title: string, priority: 'high' | 'medium' | 'low', description: string }) => {
  const priorityClasses = {
    high: 'bg-red-900/20 text-red-400 border-red-800',
    medium: 'bg-yellow-900/20 text-yellow-400 border-yellow-800',
    low: 'bg-green-900/20 text-green-400 border-green-800',
  };

  return (
    <li className="list-none">
      <div className="transition-all duration-200" tabIndex={0}>
        <div
          className="bg-gray-800/50 text-white flex flex-col gap-6 rounded-xl border py-6 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-lg transition-all duration-300 border-gray-700/50 hover:border-gray-700 focus-within:ring-2 focus-within:ring-primary/20"
          draggable="true"
          role="button"
          aria-label={`Drag task: ${title}`}
        >
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <GripVertical className="h-4 w-4 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-white text-sm leading-tight">{title}</h3>
                  <span className={`inline-flex items-center justify-center rounded-md border px-2 py-0.5 w-fit whitespace-nowrap shrink-0 text-xs font-medium flex-shrink-0 ${priorityClasses[priority]}`}>
                    {priority}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-3 line-clamp-2">{description}</p>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="h-3 w-3" />
                  <span>0 Pomo</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
};

const CurrentTasks: React.FC = () => {
  const { data: dailyPlan } = useTodayDailyPlan();
  const { currentTasks } = useCurrentTimeWindow(dailyPlan || null);

  return (
    <>
      <div className="mb-6">
        <h2 className="text-lg font-medium text-white mb-2">Today's Tasks</h2>
        <p className="text-sm text-gray-400">Drag tasks to the timer to start focusing</p>
      </div>
      <section className="w-full" aria-label="Task List">
        <div className="space-y-4">
          <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {currentTasks.length === 0 ? (
              <p className="text-gray-400 text-sm">No tasks for the current time window.</p>
            ) : (
              currentTasks.map((task: Task) => (
                <TaskCard
                  key={task.id}
                  title={task.title}
                  priority={task.priority.toLowerCase() as 'high' | 'medium' | 'low'}
                  description={task.description || ''}
                />
              ))
            )}
          </ul>
        </div>
      </section>
    </>
  );
};

export default CurrentTasks;
