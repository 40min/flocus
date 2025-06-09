import React from 'react';
import { TimeWindow as TimeWindowType } from 'types/timeWindow';
import { Task as TaskType } from 'types/task';
import { cn, formatMinutesToHHMM, formatDurationFromMinutes } from 'lib/utils';
import { Clock, XCircle } from 'lucide-react';
import TaskItem from './TaskItem';

interface TimeWindowBalloonProps {
  timeWindow: TimeWindowType;
  tasks?: TaskType[];
  onDelete?: (timeWindowId: string) => void;
}

const getTextColor = (bgColor: string): string => {
  if (!bgColor) return 'text-slate-900'; // Default text color

  // Convert hex to RGB
  let r = 0, g = 0, b = 0;
  if (bgColor.length === 7) { // #RRGGBB
    r = parseInt(bgColor.slice(1, 3), 16);
    g = parseInt(bgColor.slice(3, 5), 16);
    b = parseInt(bgColor.slice(5, 7), 16);
  } else if (bgColor.length === 4) { // #RGB
    r = parseInt(bgColor[1] + bgColor[1], 16);
    g = parseInt(bgColor[2] + bgColor[2], 16);
    b = parseInt(bgColor[3] + bgColor[3], 16);
  }

  // Calculate luminance (perceived brightness)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Use a threshold to determine text color
  return luminance > 0.3 ? 'text-slate-900' : 'text-white';
};

const TimeWindowBalloon: React.FC<TimeWindowBalloonProps> = ({ timeWindow, tasks = [], onDelete }) => {
  const { id, description, start_time, end_time, category } = timeWindow;
  const categoryColor = category?.color || '#A0AEC0'; // Default to a neutral gray
  const lightBgColor = categoryColor + '20'; // Add 20 for ~12% opacity in hex

  const textColorClass = getTextColor(categoryColor);

  const formattedStartTime = formatMinutesToHHMM(start_time);
  const formattedEndTime = formatMinutesToHHMM(end_time);
  const durationMinutes = end_time - start_time;
  const formattedDuration = formatDurationFromMinutes(durationMinutes);

  const mainDivClasses = cn(
    'relative rounded-t-[2rem] rounded-b-[1.5rem] border-2 p-4 md:p-6 shadow-lg backdrop-blur-sm transition-all duration-300 max-w-lg scale-80 ml-0',
    'hover:shadow-xl' // General hover shadow enhancement from design
  );

  return (
    <article
      className="relative group"
      role="article"
      aria-label={`Time window: ${category.name} from ${formattedStartTime} to ${formattedEndTime}, duration ${formattedDuration}`}
    >
      <div
        className={mainDivClasses}
        style={{ borderColor: categoryColor, backgroundColor: lightBgColor }}
      >
        <header className="mb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className={cn('text-base md:text-lg font-bold', textColorClass)}>
                {category.name}
              </h4>
              {description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
              )}
            </div>
            {onDelete && (
              <button
                onClick={() => onDelete(id)}
                className="text-slate-400 hover:text-red-500 transition-colors"
                aria-label="Delete time window"
              >
                <XCircle className="h-5 w-5" />
              </button>
            )}
          </div>
          <div className="flex items-center justify-between text-sm md:text-base">
            <div className="flex items-center gap-4">
              <time
                dateTime={`${formattedStartTime}/${formattedEndTime}`}
                className={cn('flex items-center gap-1 text-sm', textColorClass)}
                aria-label={`Time from ${formattedStartTime} to ${formattedEndTime}`}
              >
                <Clock className="h-3 w-3" />
                <span className={cn('text-sm', textColorClass)}>{formattedStartTime} - {formattedEndTime}</span>
              </time>
              <span className={cn('px-2 py-1 rounded-full text-xs font-small', textColorClass)} style={{ backgroundColor: categoryColor + '33' }} aria-label={`Duration: ${formattedDuration}`}>
                {formattedDuration}
              </span>
            </div>
          </div>
        </header>
        <section>
          <h3 className="sr-only">Tasks for this time window</h3>
          {tasks && tasks.length > 0 && (
            <ul className="space-y-3" role="list" aria-label="Tasks assigned to this time window">
              {tasks.map(task => (
                <li key={task.id} className="relative" role="listitem">
                  <TaskItem
                    task={task}
                    baseBgColor={lightBgColor} // Use the light background color for task items
                    baseBorderColor={categoryColor + '40'} // Slightly darker border for task items
                    baseTextColor={textColorClass}
                    hoverBgColor={categoryColor + '30'} // Slightly darker hover for task items
                    hoverBorderColor={categoryColor + '60'}
                    hoverShadowColor={categoryColor + '20'}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </article>
  );
};

export default TimeWindowBalloon;
