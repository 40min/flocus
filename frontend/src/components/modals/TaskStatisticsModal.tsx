import React from "react";
import Modal from "./Modal";
import { Button } from "@/components/ui/button";
import { Task } from "types/task";
import { formatDateTime, formatWorkingTime } from "../../utils/utils";
import { CalendarDays, PlayCircle, StopCircle, Timer } from "lucide-react";

interface TaskStatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
}

const TaskStatisticsModal: React.FC<TaskStatisticsModalProps> = ({
  isOpen,
  onClose,
  task,
}) => {
  if (!task || !isOpen) {
    return null;
  }

  const { statistics } = task;

  const statItemClass = "flex items-center space-x-2";
  const statLabelClass = "font-medium text-slate-700 flex items-center";
  const statValueClass = "text-slate-600";
  const iconClass = "mr-2 h-5 w-5 text-slate-500";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Statistics for "${task.title}"`}
    >
      <div className="space-y-4 text-sm">
        <div className={statItemClass}>
          <span className={statLabelClass}>
            <CalendarDays className={iconClass} />
            First Taken:
          </span>
          <span className={statValueClass}>
            {formatDateTime(statistics?.was_taken_at)}
          </span>
        </div>
        <div className={statItemClass}>
          <span className={statLabelClass}>
            <PlayCircle className={iconClass} />
            Last Started:
          </span>
          <span className={statValueClass}>
            {formatDateTime(statistics?.was_started_at)}
          </span>
        </div>
        <div className={statItemClass}>
          <span className={statLabelClass}>
            <StopCircle className={iconClass} />
            Last Stopped:
          </span>
          <span className={statValueClass}>
            {formatDateTime(statistics?.was_stopped_at)}
          </span>
        </div>
        <div className={statItemClass}>
          <span className={statLabelClass}>
            <Timer className={iconClass} />
            Total Active Time:
          </span>
          <span className={statValueClass}>
            {formatWorkingTime(statistics?.lasts_minutes)}
          </span>
        </div>
        <div className="flex justify-end pt-4">
          <Button variant="slate" size="medium" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default TaskStatisticsModal;
