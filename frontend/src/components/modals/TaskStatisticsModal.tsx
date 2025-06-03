import React from 'react';
import Modal from './Modal';
import { Task } from 'types/task';
import { formatDateTime, formatDurationFromMinutes } from 'lib/utils';

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Statistics for "${task.title}"`}>
      <div className="space-y-3 text-sm">
        <div>
          <span className="font-medium text-slate-700">First Taken:</span>
          <span className="ml-2 text-slate-600">{formatDateTime(statistics?.was_taken_at)}</span>
        </div>
        <div>
          <span className="font-medium text-slate-700">Last Started:</span>
          <span className="ml-2 text-slate-600">{formatDateTime(statistics?.was_started_at)}</span>
        </div>
        <div>
          <span className="font-medium text-slate-700">Last Stopped:</span>
          <span className="ml-2 text-slate-600">{formatDateTime(statistics?.was_stopped_at)}</span>
        </div>
        <div>
          <span className="font-medium text-slate-700">Total Active Time:</span>
          <span className="ml-2 text-slate-600">{formatDurationFromMinutes(statistics?.lasts_min)}</span>
        </div>
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default TaskStatisticsModal;
