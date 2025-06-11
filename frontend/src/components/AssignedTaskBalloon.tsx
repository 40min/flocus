import React from 'react';
import { Task } from '../types/task';
import { MinusCircle } from 'lucide-react';

interface AssignedTaskBalloonProps {
  task: Task;
  onUnassign: (taskId: string) => void;
}

const AssignedTaskBalloon: React.FC<AssignedTaskBalloonProps> = ({ task, onUnassign }) => {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-800 border border-slate-200">
      <span>{task.title}</span>
      <button
        type="button"
        onClick={() => onUnassign(task.id)}
        className="text-slate-500 hover:text-red-600 focus:outline-none"
        aria-label={`Unassign task: ${task.title}`}
      >
        <MinusCircle className="h-4 w-4" />
      </button>
    </div>
  );
};

export default AssignedTaskBalloon;
