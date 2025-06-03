import React from 'react';
import Modal from './Modal';
import { Task } from 'types/task';
import { formatDateTime, formatDurationFromMinutes } from 'lib/utils';
import { CalendarDays, PlayCircle, StopCircle, Timer } from 'lucide-react';

interface TaskStatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
}

const TaskStatisticsModal: React.FC<TaskStatisticsModalProps> = ({ isOpen, onClose, task }) => {
  if (!task || !isOpen) {
    return null;
  }

  const { statistics } = task;

  const statItemClass = "flex items-center space-x-2";
  const statLabelClass = "font-medium text-slate-700 flex items-center";
  const statValueClass = "text-slate-600";
  const iconClass = "mr-2 h-5 w-5 text-slate-500";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Statistics for "${task.title}"`}>
      <div className="space-y-4 text-sm">
        <div className={statItemClass}>
          <span className={statLabelClass}>
            <CalendarDays className={iconClass} />
            First Taken:
          </span>
          <span className={statValueClass}>{formatDateTime(statistics?.was_taken_at)}</span>
        </div>
        <div className={statItemClass}>
          <span className={statLabelClass}>
            <PlayCircle className={iconClass} />
            Last Started:
          </span>
          <span className={statValueClass}>{formatDateTime(statistics?.was_started_at)}</span>
        </div>
        <div className={statItemClass}>
          <span className={statLabelClass}>
            <StopCircle className={iconClass} />
            Last Stopped:
          </span>
          <span className={statValueClass}>{formatDateTime(statistics?.was_stopped_at)}</span>
        </div>
        <div className={statItemClass}>
          <span className={statLabelClass}>
            <Timer className={iconClass} />
            Total Active Time:
          </span>
          <span className={statValueClass}>{formatDurationFromMinutes(statistics?.lasts_min)}</span>
        </div>
        <div className="flex justify-end pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default TaskStatisticsModal;
