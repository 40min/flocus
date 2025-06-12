import React from 'react';
import { Clock, GripVertical } from 'lucide-react';

const TaskCard = ({ title, priority, description, pomos }: { title: string, priority: 'high' | 'medium' | 'low', description: string, pomos: number }) => {
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
                  <span>{pomos} Pomo{pomos > 1 ? 's' : ''}</span>
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
  const tasks = [
    { id: '1', title: 'Review design mockups', priority: 'high' as const, description: 'Check the latest UI designs for the dashboard', pomos: 2 },
    { id: '2', title: 'Write documentation', priority: 'medium' as const, description: 'Update API documentation for new endpoints', pomos: 3 },
    { id: '3', title: 'Team standup prep', priority: 'low' as const, description: 'Prepare updates for tomorrow\'s standup', pomos: 1 },
    { id: '4', title: 'Code review', priority: 'high' as const, description: 'Review pull requests from team members', pomos: 2 },
  ];

  return (
    <>
      <div className="mb-6">
        <h2 className="text-lg font-medium text-white mb-2">Today's Tasks</h2>
        <p className="text-sm text-gray-400">Drag tasks to the timer to start focusing</p>
      </div>
      <section className="w-full" aria-label="Task List">
        <div className="space-y-4">
          <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {tasks.map(task => (
              <TaskCard key={task.id} {...task} />
            ))}
          </ul>
        </div>
      </section>
    </>
  );
};

export default CurrentTasks;
