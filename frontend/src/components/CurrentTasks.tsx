import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useDraggable } from '@dnd-kit/core';
import { Clock, GripVertical, Pause, Play, Trash2 } from 'lucide-react';
import { useCurrentTimeWindow } from '../hooks/useCurrentTimeWindow';
import { Task, TaskUpdateRequest } from '../types/task';
import { DailyPlanResponse } from '../types/dailyPlan';
import { cn } from '../lib/utils';
import { useSharedTimerContext } from '../context/SharedTimerContext';
import { useDeleteTask, useUpdateTask } from 'hooks/useTasks';
import Button from './Button';

const TaskCard = ({ task }: { task: Task }) => {
  const {
    currentTaskId,
    isActive,
    handleStartPause,
    resetForNewTask,
    setCurrentTaskId,
    setCurrentTaskName,
    setCurrentTaskDescription,
    setOnTaskChanged,
    setIsActive,
    stopCurrentTask,
  } = useSharedTimerContext();

  const { mutateAsync: updateTask } = useUpdateTask();
  const { mutate: deleteTask } = useDeleteTask();
  const isActiveTask = currentTaskId === task.id;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: isActiveTask,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const priorityClasses = {
    high: 'bg-red-500/10 text-red-600 border-red-500/30',
    medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
    low: 'bg-accent-DEFAULT/10 text-accent-dark border-accent-DEFAULT/30',
  };
  const priority = task.priority.toLowerCase() as 'high' | 'medium' | 'low';

  const handleStart = async () => {
    await resetForNewTask();
    setCurrentTaskId(task.id);
    setCurrentTaskName(task.title);
    setCurrentTaskDescription(task.description);
    setOnTaskChanged(() => (id: string, data: TaskUpdateRequest) => updateTask({ taskId: id, taskData: data }));
    await updateTask({ taskId: task.id, taskData: { status: 'in_progress' } });
    setIsActive(true);
  };

  const handlePause = () => {
    handleStartPause();
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete the task "${task.title}"?`)) {
      if (currentTaskId === task.id) {
        await stopCurrentTask();
      }
      deleteTask(task.id);
    }
  };

  return (
    <li className="list-none" ref={setNodeRef} style={style}>
      <div className={cn('transition-all duration-200', isDragging && 'opacity-50 shadow-2xl z-50 relative', isActiveTask && 'cursor-not-allowed opacity-70')} tabIndex={0}>
        <div
          className="bg-background-card text-text-DEFAULT flex flex-col gap-6 rounded-xl border py-6 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-lg transition-all duration-300 border-border-DEFAULT hover:border-border-dark focus-within:ring-2 focus-within:ring-primary/20"
          aria-label={`Drag task: ${task.title}`}
          {...listeners}
          {...attributes}
        >
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <GripVertical className="h-4 w-4 text-text-light" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-text-DEFAULT text-sm leading-tight">{task.title}</h3>
                  <span className={`inline-flex items-center justify-center rounded-md border px-2 py-0.5 w-fit whitespace-nowrap shrink-0 text-xs font-medium flex-shrink-0 ${priorityClasses[priority]}`}>
                    {priority}
                  </span>
                </div>
                <div className="text-xs text-text-secondary mb-3">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ node, ...props }) => <a className="text-primary-DEFAULT underline hover:text-primary-dark" target="_blank" rel="noopener noreferrer" {...props as React.AnchorHTMLAttributes<HTMLAnchorElement>} onMouseDown={(e) => e.stopPropagation()} />,
                    }}
                  >
                    {task.description || ''}
                  </ReactMarkdown>
                </div>
                <div className="flex items-center gap-1 text-xs text-text-secondary">
                  <Clock className="h-3 w-3" />
                  <span>{task.statistics?.lasts_min ? `${Math.floor(task.statistics.lasts_min / 60)}h ${task.statistics.lasts_min % 60}m` : '0h 0m'}</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Button
                    onClick={handleStart}
                    disabled={isActive}
                    variant="ghost"
                    size="icon"
                    title="Start task"
                    className="disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={handlePause}
                    disabled={!isActive || !isActiveTask}
                    variant="ghost"
                    size="icon"
                    title="Pause task"
                    className="disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Pause className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={handleDelete}
                    variant="ghost"
                    size="icon"
                    title="Delete task"
                    className="text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
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
}

const CurrentTasks: React.FC<CurrentTasksProps> = ({ dailyPlan }) => {
  const { currentTimeWindow, currentTasks } = useCurrentTimeWindow(dailyPlan || null);

  return (
    <>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-text-DEFAULT bg-background-card p-2 rounded-md mb-2">Today's Tasks</h2>
        {currentTimeWindow !== null && (
          <p className="text-sm text-green-100 text-center">Drag tasks to the timer to start focusing</p>
        )}
      </div>
      <section className="w-full" aria-label="Task List">
        <div className="space-y-4">
          <ul className="space-y-3 h-full overflow-y-auto pr-2">
            {currentTimeWindow === null ? (
              <p className="text-text-secondary text-sm">No works planned for this time.</p>
            ) : currentTasks.length === 0 ? (
              <p className="text-text-secondary text-sm">No tasks for the current time window.</p>
            ) : (
              currentTasks.map((task: Task) => (
                <TaskCard key={task.id} task={task} />
              ))
            )}
          </ul>
        </div>
      </section>
    </>
  );
};

export default CurrentTasks;
