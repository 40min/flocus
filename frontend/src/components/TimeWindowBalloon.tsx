import React from 'react';
import { TimeWindow as TimeWindowType } from 'types/timeWindow';
import { Task as TaskType } from 'types/task';
import { cn, formatMinutesToHHMM, formatDurationFromMinutes } from 'lib/utils';
import { Clock } from 'lucide-react';

interface TimeWindowBalloonProps {
  timeWindow: TimeWindowType;
  tasks?: TaskType[]; // Tasks prop for future use, not rendered in this version
}

const categoryColorToTailwindPrefix: { [hex: string]: string } = {
  '#3B82F6': 'blue',    // Blue
  '#10B981': 'emerald', // Green in categories page, emerald in planned_day_editor design
  '#F59E0B': 'orange',  // Yellow in categories page, orange in planned_day_editor design
  '#EF4444': 'red',
  '#8B5CF6': 'purple',
  '#EC4899': 'pink',
  '#6366F1': 'indigo',
  '#6B7280': 'gray',
};

const getColorClasses = (hexColor?: string) => {
  const defaultColors = {
    bg: 'bg-slate-100/80',
    border: 'border-slate-300',
    text: 'text-slate-900',
    hoverBorder: 'hover:border-slate-400',
    shadow: 'hover:shadow-slate-200/50',
    durationBadgeBg: 'bg-slate-100/80',
    durationBadgeText: 'text-slate-900',
  };

  if (!hexColor) return defaultColors;

  const colorName = categoryColorToTailwindPrefix[hexColor.toUpperCase()] || 'slate';

  if (colorName === 'slate') return defaultColors;

  return {
    bg: `bg-${colorName}-100/80`,
    border: `border-${colorName}-300`,
    text: `text-${colorName}-900`,
    hoverBorder: `hover:border-${colorName}-400`,
    shadow: `hover:shadow-${colorName}-200/50`,
    durationBadgeBg: `bg-${colorName}-100/80`, // Or a lighter shade like bg-${colorName}-50
    durationBadgeText: `text-${colorName}-900`,
  };
};

const TimeWindowBalloon: React.FC<TimeWindowBalloonProps> = ({ timeWindow, tasks = [] }) => {
  const { name, start_time, end_time, category } = timeWindow;
  const colors = getColorClasses(category?.color);

  const formattedStartTime = formatMinutesToHHMM(start_time);
  const formattedEndTime = formatMinutesToHHMM(end_time);
  const durationMinutes = end_time - start_time;
  const formattedDuration = formatDurationFromMinutes(durationMinutes);

  const mainDivClasses = cn(
    'relative rounded-t-[2rem] rounded-b-[1.5rem] border-2 p-6 md:p-8 shadow-lg backdrop-blur-sm transition-all duration-300',
    colors.bg,
    colors.border,
    colors.hoverBorder,
    colors.shadow,
    'hover:shadow-xl' // General hover shadow enhancement from design
  );

  const titleClasses = cn('text-xl md:text-2xl font-bold mb-3', colors.text);
  const timeTextClasses = cn('flex items-center gap-1', colors.text);
  const durationBadgeClasses = cn('px-2 py-1 rounded-full text-xs font-medium', colors.durationBadgeBg, colors.durationBadgeText);

  return (
    <article
      className="relative group"
      role="article"
      aria-label={`Time window: ${name} from ${formattedStartTime} to ${formattedEndTime}, duration ${formattedDuration}`}
    >
      <div className={mainDivClasses}>
        <header className="mb-6">
          <h2 className={titleClasses}>{name}</h2>
          <div className="flex items-center justify-between text-sm md:text-base">
            <div className="flex items-center gap-4">
              <time
                dateTime={`${formattedStartTime}/${formattedEndTime}`}
                className={timeTextClasses}
                aria-label={`Time from ${formattedStartTime} to ${formattedEndTime}`}
              >
                <Clock className="h-4 w-4" />
                <span className="font-medium">{formattedStartTime} - {formattedEndTime}</span>
              </time>
              <span className={durationBadgeClasses} aria-label={`Duration: ${formattedDuration}`}>
                {formattedDuration}
              </span>
            </div>
          </div>
        </header>
        <section className="mb-6">
          <h3 className="sr-only">Tasks for this time window</h3>
          <ul className="space-y-3" role="list" aria-label="Tasks assigned to this time window">
            {/* TaskPill components would go here. For now, it's empty or can have a placeholder. */}
          </ul>
        </section>
        {/* Resize handle omitted as per thought process */}
      </div>
    </article>
  );
};

export default TimeWindowBalloon;
