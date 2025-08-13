import React from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { formatDurationFromMinutes } from "../utils/utils";

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
 * Renders a vertical timeline with solid areas representing time windows and gaps.
 * Time windows are shown as colored bars with their duration.
 * Gaps between time windows are shown as gray bars with duration.
 */
const Timeline: React.FC<TimelineProps> = ({ timeWindows, className }) => {
  const [animationParent] = useAutoAnimate({
    duration: 300,
    easing: "ease-in-out",
  });
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
   * Formats time range for display based on duration
   * @param startTime - Start time ISO string
   * @param endTime - End time ISO string
   * @param durationMinutes - Duration in minutes
   * @returns Formatted time range string
   */
  const formatTimeRange = (
    startTime: string,
    endTime: string,
    durationMinutes: number
  ): string => {
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    // Short intervals: show "10:15 - 10:30 AM" format (start time without AM/PM)
    const startTimeStr = startDate
      .toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      .replace(/ (AM|PM)$/, ""); // Remove AM/PM from start time

    const endTimeStr = endDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    return `${startTimeStr} - ${endTimeStr}`;
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
   * Calculate the height for a time interval based on its duration
   * @param durationMinutes - Duration in minutes
   * @returns Height in pixels (minimum 20px, 2px per minute)
   */
  const calculateBarHeight = (durationMinutes: number): number => {
    return Math.max(20, durationMinutes * 2);
  };

  /**
   * Renders timeline elements including time windows and gaps as solid areas
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
          const gapHeight = calculateBarHeight(gapMinutes);

          elements.push(
            <div
              key={`gap-${prevWindow.id}-${timeWindow.id}`}
              className="relative flex items-start"
              style={{ height: `${gapHeight}px` }}
            >
              {/* Gap bar - solid gray area (no duration label) */}
              <div
                className="absolute left-1/2 -translate-x-1/2 bg-gray-200 border border-gray-300 rounded-sm"
                style={{
                  width: "6px",
                  height: `${gapHeight}px`,
                }}
                title={`Gap: ${formatDurationFromMinutes(gapMinutes)}`}
              >
                {/* Optional: Add a pattern or dots to indicate it's a gap */}
                <div className="w-full h-full bg-gradient-to-b from-gray-300 to-gray-200 rounded-sm opacity-50"></div>
              </div>
            </div>
          );
        }
      }

      // Calculate time window duration and height
      const startMinutes = dateToMinutes(timeWindow.start_time);
      const endMinutes = dateToMinutes(timeWindow.end_time);
      const durationMinutes = endMinutes - startMinutes;
      const barHeight = calculateBarHeight(durationMinutes);

      // Add the time window as a solid bar
      elements.push(
        <div
          key={timeWindow.id}
          className="relative flex items-start"
          style={{ height: `${barHeight}px` }}
        >
          {/* Time label positioned to the left of the central line */}
          <div className="absolute right-full pr-1 text-xs text-gray-400 font-medium whitespace-nowrap">
            {formatTimeRange(
              timeWindow.start_time,
              timeWindow.end_time,
              durationMinutes
            )}
          </div>

          {/* Color-coded bar representing the time window duration */}
          <div
            className="absolute left-1/2 -translate-x-1/2 border-2 border-white rounded-sm shadow-sm"
            style={{
              backgroundColor: timeWindow.category.color,
              width: "8px",
              height: `${barHeight}px`,
            }}
            title={`${timeWindow.category.name}: ${formatDurationFromMinutes(
              durationMinutes
            )}`}
          >
            {/* Optional: Add a subtle gradient for visual depth */}
            <div
              className="w-full h-full rounded-sm opacity-20"
              style={{
                background: `linear-gradient(to bottom, rgba(255,255,255,0.3), rgba(0,0,0,0.1))`,
              }}
            ></div>
          </div>
        </div>
      );
    });

    return elements;
  };

  return (
    // The root element is an <aside> tag with relative positioning for its children.
    <aside className={`relative w-28 flex-shrink-0 p-4 ${className || ""}`}>
      {/* The central vertical line - now thinner since we have solid bars */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-gray-200"></div>

      {/* Container for the timeline bars */}
      <div ref={animationParent} className="relative pt-8">
        {renderTimelineElements()}
      </div>
    </aside>
  );
};

export default Timeline;
