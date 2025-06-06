import React from 'react';
import { TimeWindow as TimeWindowType } from 'types/timeWindow';
import { Task as TaskType } from 'types/task';
import { cn, formatMinutesToHHMM, formatDurationFromMinutes } from 'lib/utils';
import { Clock } from 'lucide-react';
import TaskItem from './TaskItem';

interface TimeWindowBalloonProps {
  timeWindow: TimeWindowType;
  tasks?: TaskType[];
}

const categoryColorToTailwindPrefix: { [hex: string]: string } = {
  '#EF4444': 'red',
  '#F97316': 'orange',
  '#F59E0B': 'amber',
  '#EAB308': 'yellow',
  '#84CC16': 'lime',
  '#22C55E': 'green',
  '#10B981': 'emerald',
  '#14B8A6': 'teal',
  '#06B6D4': 'cyan',
  '#0EA5E9': 'sky',
  '#3B82F6': 'blue',
  '#6366F1': 'indigo',
  '#8B5CF6': 'violet',
  '#A855F7': 'purple',
  '#D946EF': 'fuchsia',
  '#EC4899': 'pink',
  '#F43F5E': 'rose',
  '#6B7280': 'gray',
};

const getColorScheme = (hexColor?: string) => {
  const defaultColorName = 'slate';
  const colorName = hexColor ? (categoryColorToTailwindPrefix[hexColor.toUpperCase()] || defaultColorName) : defaultColorName;

  const balloonColors = {
    bg: `bg-${colorName === defaultColorName ? 'slate-100/80' : `${colorName}-100/80`}`,
    border: `border-${colorName === defaultColorName ? 'slate-300' : `${colorName}-300`}`,
    text: `text-${colorName === defaultColorName ? 'slate-900' : `${colorName}-900`}`,
    hoverBorder: `hover:border-${colorName === defaultColorName ? 'slate-400' : `${colorName}-400`}`,
    shadow: `hover:shadow-${colorName === defaultColorName ? 'slate-200/50' : `${colorName}-200/50`}`,
    durationBadgeBg: `bg-${colorName === defaultColorName ? 'slate-100/80' : `${colorName}-100/80`}`,
    durationBadgeText: `text-${colorName === defaultColorName ? 'slate-900' : `${colorName}-900`}`,
  };

  const taskItemColors = {
    baseBgColor: `bg-${colorName === defaultColorName ? 'slate-50' : `${colorName}-50`}`,
    baseBorderColor: `border-${colorName === defaultColorName ? 'slate-200' : `${colorName}-200`}`,
    baseTextColor: `text-${colorName === defaultColorName ? 'slate-700' : `${colorName}-700`}`,
    hoverBgColor: `hover:bg-${colorName === defaultColorName ? 'slate-100' : `${colorName}-100`}`,
    hoverBorderColor: `hover:border-${colorName === defaultColorName ? 'slate-300' : `${colorName}-300`}`,
    hoverShadowColor: `hover:shadow-${colorName === defaultColorName ? 'slate-200/50' : `${colorName}-200/50`}`,
  };

  return { balloonColors, taskItemColors };
};

const TimeWindowBalloon: React.FC<TimeWindowBalloonProps> = ({ timeWindow, tasks = [] }) => {
  const { name, start_time, end_time, category } = timeWindow;
  const { balloonColors, taskItemColors } = getColorScheme(category?.color);

  const formattedStartTime = formatMinutesToHHMM(start_time);
  const formattedEndTime = formatMinutesToHHMM(end_time);
  const durationMinutes = end_time - start_time;
  const formattedDuration = formatDurationFromMinutes(durationMinutes);

  const mainDivClasses = cn(
    'relative rounded-t-[2rem] rounded-b-[1.5rem] border-2 p-4 md:p-6 shadow-lg backdrop-blur-sm transition-all duration-300 max-w-lg scale-80 ml-0',
    balloonColors.bg,
    balloonColors.border,
    balloonColors.hoverBorder,
    balloonColors.shadow,
    'hover:shadow-xl' // General hover shadow enhancement from design
  );

  const titleClasses = cn('text-base md:text-lg font-bold mb-3', balloonColors.text);
  const timeTextClasses = cn('flex items-center gap-1 text-sm text-slate-400', balloonColors.text);
  const durationBadgeClasses = cn('px-2 py-1 rounded-full text-xs font-small text-slate-600', balloonColors.durationBadgeBg, balloonColors.durationBadgeText);

  return (
    <article
      className="relative group"
      role="article"
      aria-label={`Time window: ${name} from ${formattedStartTime} to ${formattedEndTime}, duration ${formattedDuration}`}
    >
      <div className={mainDivClasses}>
        <header className="mb-6">
          <h4 className={titleClasses}>{name}</h4>
          <div className="flex items-center justify-between text-sm md:text-base">
            <div className="flex items-center gap-4">
              <time
                dateTime={`${formattedStartTime}/${formattedEndTime}`}
                className={timeTextClasses}
                aria-label={`Time from ${formattedStartTime} to ${formattedEndTime}`}
              >
                <Clock className="h-3 w-3" />
                <span className="text-sm text-slate-600">{formattedStartTime} - {formattedEndTime}</span>
              </time>
              <span className={durationBadgeClasses} aria-label={`Duration: ${formattedDuration}`}>
                {formattedDuration}
              </span>
            </div>
          </div>
        </header>
        <section className="mb-6">
          <h3 className="sr-only">Tasks for this time window</h3>
          {tasks && tasks.length > 0 && (
            <ul className="space-y-3" role="list" aria-label="Tasks assigned to this time window">
              {tasks.map(task => (
                <li key={task.id} className="relative" role="listitem">
                  <TaskItem
                    task={task}
                    baseBgColor={taskItemColors.baseBgColor}
                    baseBorderColor={taskItemColors.baseBorderColor}
                    baseTextColor={taskItemColors.baseTextColor}
                    hoverBgColor={taskItemColors.hoverBgColor}
                    hoverBorderColor={taskItemColors.hoverBorderColor}
                    hoverShadowColor={taskItemColors.hoverShadowColor}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
        {/* Resize handle omitted as per thought process */}
      </div>
    </article>
  );
};

export default TimeWindowBalloon;
