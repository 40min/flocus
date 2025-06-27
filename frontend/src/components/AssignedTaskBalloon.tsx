import React from 'react';
import { Task } from '../types/task';
import Button from 'components/Button';
import { MinusCircle } from 'lucide-react';

interface AssignedTaskBalloonProps {
  task: Task;
  onUnassign?: (taskId: string) => void;
}

const AssignedTaskBalloon: React.FC<AssignedTaskBalloonProps> = ({ task, onUnassign }) => {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-800 border border-slate-200">
      <span>{task.title}</span>
      {onUnassign && (
        <Button
          onClick={() => onUnassign(task.id)}
          variant="ghost"
          size="icon"
          className="!p-0 h-auto text-slate-500 hover:text-red-600 focus:outline-none"
          aria-label={`Unassign task: ${task.title}`}
        >
          <MinusCircle className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default AssignedTaskBalloon;
