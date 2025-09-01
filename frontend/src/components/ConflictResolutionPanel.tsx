import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Edit, Trash2, Clock, Tag } from "lucide-react";
import type { TimeWindowAllocation } from "../types/dailyPlan";
import { formatTimeFromMinutes } from "../utils/utils";
import { cn } from "../utils/utils";

interface ConflictInfo {
  timeWindowIds: string[];
  message: string;
  type: "overlap" | "category_conflict";
}

interface ConflictResolutionPanelProps {
  conflicts: ConflictInfo[];
  timeWindows: TimeWindowAllocation[];
  onEdit: (allocation: TimeWindowAllocation) => void;
  onDelete: (timeWindowId: string) => void;
  className?: string;
}

const ConflictResolutionPanel: React.FC<ConflictResolutionPanelProps> = ({
  conflicts,
  timeWindows,
  onEdit,
  onDelete,
  className,
}) => {
  if (conflicts.length === 0) {
    return null;
  }

  const getTimeWindowById = (id: string) => {
    return timeWindows.find((alloc) => alloc.time_window.id === id);
  };

  const getConflictSeverity = (conflict: ConflictInfo) => {
    return conflict.type === "category_conflict" ? "high" : "medium";
  };

  const getConflictIcon = (type: ConflictInfo["type"]) => {
    switch (type) {
      case "overlap":
        return <Clock size={16} className="text-amber-600" />;
      case "category_conflict":
        return <Tag size={16} className="text-red-600" />;
      default:
        return <AlertTriangle size={16} className="text-red-600" />;
    }
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case "high":
        return "border-red-200 bg-red-50";
      case "medium":
        return "border-amber-200 bg-amber-50";
      default:
        return "border-slate-200 bg-slate-50";
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={20} className="text-red-600" />
        <h3 className="text-lg font-semibold text-red-900">
          Scheduling Conflicts ({conflicts.length})
        </h3>
      </div>

      {conflicts.map((conflict, index) => {
        const severity = getConflictSeverity(conflict);
        const conflictingWindows = conflict.timeWindowIds
          .map(getTimeWindowById)
          .filter(Boolean) as TimeWindowAllocation[];

        return (
          <div
            key={index}
            className={cn("border rounded-lg p-4", getSeverityStyles(severity))}
          >
            <div className="flex items-start gap-3 mb-3">
              {getConflictIcon(conflict.type)}
              <div className="flex-1">
                <p className="font-medium text-slate-900 mb-1">
                  {conflict.type === "overlap"
                    ? "Time Window Overlap"
                    : "Category Conflict"}
                </p>
                <p className="text-sm text-slate-700">{conflict.message}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-slate-800">
                Conflicting Time Windows:
              </h4>

              {conflictingWindows.map((allocation) => (
                <div
                  key={allocation.time_window.id}
                  className="bg-white border border-slate-200 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor:
                            allocation.time_window.category.color || "#A0AEC0",
                        }}
                      />
                      <span className="font-medium text-slate-900">
                        {allocation.time_window.description}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(allocation)}
                        className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900"
                        title="Edit time window"
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(allocation.time_window.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        title="Delete time window"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <span>
                      {formatTimeFromMinutes(allocation.time_window.start_time)}{" "}
                      - {formatTimeFromMinutes(allocation.time_window.end_time)}
                    </span>
                    <span className="text-xs px-2 py-1 bg-slate-100 rounded-full">
                      {allocation.time_window.category.name}
                    </span>
                    {allocation.tasks.length > 0 && (
                      <span className="text-xs text-slate-500">
                        {allocation.tasks.length} task
                        {allocation.tasks.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h5 className="text-sm font-medium text-blue-900 mb-1">
                Resolution Suggestions:
              </h5>
              <ul className="text-sm text-blue-800 space-y-1">
                {conflict.type === "overlap" ? (
                  <>
                    <li>
                      • Adjust the start or end times to eliminate overlap
                    </li>
                    <li>• Delete one of the overlapping time windows</li>
                    <li>
                      • Merge the time windows if they serve the same purpose
                    </li>
                  </>
                ) : (
                  <>
                    <li>• Change one time window to use the same category</li>
                    <li>
                      • Adjust timing to separate different category activities
                    </li>
                    <li>• Delete one of the conflicting time windows</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        );
      })}

      <div className="mt-6 p-4 bg-slate-100 border border-slate-200 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertTriangle
            size={16}
            className="text-slate-600 mt-0.5 flex-shrink-0"
          />
          <div className="text-sm text-slate-700">
            <p className="font-medium mb-1">How to resolve conflicts:</p>
            <p>
              Use the edit (✏️) or delete (🗑️) buttons above to modify
              conflicting time windows. Your plan cannot be approved until all
              conflicts are resolved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConflictResolutionPanel;
