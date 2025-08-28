import React from "react";
import { AlertTriangle, Clock, Tag } from "lucide-react";
import { cn } from "../utils/utils";

interface ConflictIndicatorProps {
  type: "overlap" | "category_conflict";
  severity?: "low" | "medium" | "high";
  size?: "sm" | "md" | "lg";
  className?: string;
  showTooltip?: boolean;
}

const ConflictIndicator: React.FC<ConflictIndicatorProps> = ({
  type,
  severity = "medium",
  size = "md",
  className,
  showTooltip = true,
}) => {
  const getIcon = () => {
    switch (type) {
      case "overlap":
        return Clock;
      case "category_conflict":
        return Tag;
      default:
        return AlertTriangle;
    }
  };

  const getColors = () => {
    switch (severity) {
      case "high":
        return "bg-red-500 text-white border-red-600";
      case "medium":
        return "bg-amber-500 text-white border-amber-600";
      case "low":
        return "bg-yellow-400 text-slate-900 border-yellow-500";
      default:
        return "bg-red-500 text-white border-red-600";
    }
  };

  const getSizes = () => {
    switch (size) {
      case "sm":
        return "w-5 h-5 p-1";
      case "md":
        return "w-6 h-6 p-1";
      case "lg":
        return "w-8 h-8 p-1.5";
      default:
        return "w-6 h-6 p-1";
    }
  };

  const getIconSize = () => {
    switch (size) {
      case "sm":
        return 12;
      case "md":
        return 14;
      case "lg":
        return 18;
      default:
        return 14;
    }
  };

  const getTooltipText = () => {
    switch (type) {
      case "overlap":
        return "Time window overlap detected";
      case "category_conflict":
        return "Category conflict detected";
      default:
        return "Scheduling conflict detected";
    }
  };

  const Icon = getIcon();

  return (
    <div
      className={cn(
        "rounded-full border-2 flex items-center justify-center animate-pulse",
        getColors(),
        getSizes(),
        className
      )}
      title={showTooltip ? getTooltipText() : undefined}
    >
      <Icon size={getIconSize()} />
    </div>
  );
};

export default ConflictIndicator;
