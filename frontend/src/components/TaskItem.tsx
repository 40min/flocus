import React from 'react';
import { Task as TaskType } from 'types/task';
import { cn } from 'lib/utils';

interface TaskItemProps {
  task: TaskType;
  baseBgColor: string;
  baseBorderColor: string;
  baseTextColor: string;
  hoverBgColor: string;
  hoverBorderColor: string;
  hoverShadowColor: string;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  baseBgColor,
  baseBorderColor,
  baseTextColor,
  hoverBgColor,
  hoverBorderColor,
  hoverShadowColor,
}) => {
  const taskItemClasses = cn(
    'inline-flex items-center px-3 py-2 rounded-full border text-sm font-medium',
    'cursor-default',
    'transition-all duration-200 ease-out focus:outline-none',
    'select-none shadow-sm hover:shadow-md',
    baseBgColor,
    baseBorderColor,
    baseTextColor,
    hoverBgColor,
    hoverBorderColor,
    hoverShadowColor
  );

  return (
    <span className={taskItemClasses} aria-label={`Task: ${task.title}`}>
      <span className="truncate max-w-[200px] md:max-w-[300px]">{task.title}</span>
    </span>
  );
};

export default TaskItem;
