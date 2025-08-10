import React from "react";
import { cn, formatDurationFromMinutes } from "lib/utils";

interface GapIndicatorProps {
  durationMinutes: number;
  className?: string;
}

const GapIndicator: React.FC<GapIndicatorProps> = ({
  durationMinutes,
  className,
}) => {
  const formattedDuration = formatDurationFromMinutes(durationMinutes);

  return (
    <div className="relative group scale-80 ml-0 max-w-lg">
      <div
        className={cn(
          "flex items-center justify-center bg-gray-100 border-2 border-gray-300 border-dashed rounded-lg py-3 px-4 max-w-xs mx-auto",
          "text-gray-500 text-sm font-medium",
          className
        )}
        aria-label={`Gap of ${formattedDuration}`}
      >
        <span>{formattedDuration}</span>
      </div>
    </div>
  );
};

export default GapIndicator;
