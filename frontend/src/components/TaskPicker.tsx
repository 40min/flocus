import React, { useMemo } from 'react';
import { Task } from '../types/task';
import { useTasksByCategory } from '../hooks/useTasks';
import Button from './Button';

interface TaskPickerProps {
  categoryId: string;
  assignedTaskIds: string[];
  onSelectTask: (task: Task) => void;
  onClose: () => void;
}

const TaskPicker: React.FC<TaskPickerProps> = ({
  categoryId,
  assignedTaskIds,
  onSelectTask,
  onClose,
}) => {
  const { data: tasks, isLoading, error } = useTasksByCategory(categoryId);

  const availableTasks = useMemo(() => {
    if (!tasks) return [];
    const assignedIdsSet = new Set(assignedTaskIds);
    return tasks.filter((task) => !assignedIdsSet.has(task.id));
  }, [tasks, assignedTaskIds]);

  return (
    <div className="fixed inset-0 z-40 bg-black bg-opacity-25" onClick={onClose} data-testid="overlay">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm rounded-lg bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Select a Task</h3>
        {isLoading && <p>Loading tasks...</p>}
        {error && <p className="text-red-500">Error loading tasks.</p>}
        {!isLoading && !error && (
          <ul className="max-h-60 overflow-y-auto space-y-1">
            {availableTasks.length > 0 ? (
              availableTasks.map((task) => (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => onSelectTask(task)}
                    className="w-full text-left p-2 rounded-md hover:bg-slate-100 transition-colors"
                  >
                    {task.title}
                  </button>
                </li>
              ))
            ) : (
              <li className="p-2 text-slate-500">No available tasks in this category.</li>
            )}
          </ul>
        )}
        <div className="mt-4 flex justify-end">
          <Button type="button" onClick={onClose} variant="secondary" size="medium">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TaskPicker;
