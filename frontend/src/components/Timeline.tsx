import React from "react";
import { formatDurationFromMinutes } from "../lib/utils";

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
 * Gaps between time windows are shown as small gray dots with duration.
 */
const Timeline: React.FC<TimelineProps> = ({ timeWindows, className }) => {
  /**
   * Formats an ISO date string into a localized time string (e.g., "9:00 AM").
   * @param dateString - The ISO date string to format.
   * @returns A formatted time string.
   */
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);

    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  /**
   * Converts ISO date string to minutes since midnight
   * @param dateString - The ISO date string
   * @returns Minutes since midnight
   */
  const dateToMinutes = (dateString: string): number => {
    const date = new Date(dateString);
    return date.getHours() * 60 + date.getMinutes();
  };

  /**
   * Renders timeline elements including time windows and gaps
   */
  const renderTimelineElements = () => {
    if (!timeWindows || timeWindows.length === 0) {
      return null;
    }

    const sortedWindows = [...timeWindows].sort(
      (a, b) => dateToMinutes(a.start_time) - dateToMinutes(b.start_time)
    );

    const elements: React.ReactNode[] = [];

    sortedWindows.forEach((timeWindow, index) => {
      // Add gap indicator before this time window (except for the first one)
      if (index > 0) {
        const prevWindow = sortedWindows[index - 1];
        const prevEndMinutes = dateToMinutes(prevWindow.end_time);
        const currentStartMinutes = dateToMinutes(timeWindow.start_time);
        const gapMinutes = currentStartMinutes - prevEndMinutes;

        if (gapMinutes > 0) {
          elements.push(
            <div
              key={`gap-${prevWindow.id}-${timeWindow.id}`}
              className="relative flex items-center mb-10"
            >
              {/* Gap duration label */}
              <span className="absolute right-full pr-4 text-xs text-gray-400 font-medium whitespace-nowrap">
                {formatDurationFromMinutes(gapMinutes)}
              </span>

              {/* Small gray dot for gap */}
              <div
                className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-gray-400"
                title={`Gap: ${formatDurationFromMinutes(gapMinutes)}`}
              ></div>
            </div>
          );
        }
      }

      // Add the time window marker
      elements.push(
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
      );
    });

    return elements;
  };

  return (
    // The root element is an <aside> tag with relative positioning for its children.
    <aside className={`relative w-28 flex-shrink-0  p-4 ${className || ""}`}>
      {/* The central vertical line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-gray-300"></div>

      {/* Container for the list of time markers */}
      <div className="relative pt-8">{renderTimelineElements()}</div>
    </aside>
  );
};

export default Timeline;
