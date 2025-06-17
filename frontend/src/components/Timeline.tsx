import React from 'react';

// In a larger application, this interface would likely live in a shared types file (e.g., `src/types.ts`)
interface TimeWindow {
  id: string;
  start_time: string;
  end_time: string;
  category: {
    id: string;
    name: string;
    color: string;
  };
}

interface TimelineProps {
  timeWindows: TimeWindow[];
  className?: string;
}

/**
 * Renders a vertical timeline with markers for each time window.
 * Each marker shows the start time and a color-coded dot.
 */
const Timeline: React.FC<TimelineProps> = ({ timeWindows, className }) => {
  /**
   * Formats an ISO date string into a localized time string (e.g., "9:00 AM").
   * @param dateString - The ISO date string to format.
   * @returns A formatted time string.
   */
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    // The root element is an <aside> tag with relative positioning for its children.
    <aside className={`relative w-28 flex-shrink-0  p-4 ${className || ''}`}>
      {/* The central vertical line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-gray-300"></div>

      {/* Container for the list of time markers */}
      <div className="relative pt-8">
        {/* Map over the timeWindows prop to render each marker */}
        {timeWindows.map((timeWindow) => (
          <div key={timeWindow.id} className="relative flex items-center mb-20">
            {/* Time label, positioned to the left of the central line */}
            <span className="absolute right-full pr-4 text-sm text-gray-600 font-medium whitespace-nowrap">
              {formatTime(timeWindow.start_time)}
            </span>

            {/* Color-coded dot, centered on the central line */}
            <div
              className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white"
              style={{ backgroundColor: timeWindow.category.color }}
              title={timeWindow.category.name} // Add a tooltip for accessibility
            ></div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default Timeline;
