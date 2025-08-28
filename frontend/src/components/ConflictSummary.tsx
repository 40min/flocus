import React from "react";
import { AlertTriangle, Clock, Tag, CheckCircle } from "lucide-react";
import { cn } from "../utils/utils";

interface ConflictInfo {
  timeWindowIds: string[];
  message: string;
  type: "overlap" | "category_conflict";
}

interface ConflictSummaryProps {
  conflicts: ConflictInfo[];
  className?: string;
  variant?: "compact" | "detailed";
}

const ConflictSummary: React.FC<ConflictSummaryProps> = ({
  conflicts,
  className,
  variant = "compact",
}) => {
  const hasConflicts = conflicts.length > 0;
  const overlapConflicts = conflicts.filter((c) => c.type === "overlap");
  const categoryConflicts = conflicts.filter(
    (c) => c.type === "category_conflict"
  );

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium",
          hasConflicts
            ? "bg-red-50 text-red-800 border border-red-200"
            : "bg-green-50 text-green-800 border border-green-200",
          className
        )}
      >
        {hasConflicts ? (
          <>
            <AlertTriangle size={16} />
            <span>
              {conflicts.length} conflict{conflicts.length > 1 ? "s" : ""}{" "}
              detected
            </span>
          </>
        ) : (
          <>
            <CheckCircle size={16} />
            <span>No conflicts detected</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        {hasConflicts ? (
          <AlertTriangle size={20} className="text-red-600" />
        ) : (
          <CheckCircle size={20} className="text-green-600" />
        )}
        <h3
          className={cn(
            "text-lg font-semibold",
            hasConflicts ? "text-red-900" : "text-green-900"
          )}
        >
          {hasConflicts ? "Conflicts Detected" : "No Conflicts"}
        </h3>
      </div>

      {hasConflicts ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {overlapConflicts.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-amber-600" />
                <h4 className="font-medium text-amber-900">
                  Time Overlaps ({overlapConflicts.length})
                </h4>
              </div>
              <p className="text-sm text-amber-800">
                Time windows with overlapping schedules that need adjustment.
              </p>
            </div>
          )}

          {categoryConflicts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Tag size={16} className="text-red-600" />
                <h4 className="font-medium text-red-900">
                  Category Conflicts ({categoryConflicts.length})
                </h4>
              </div>
              <p className="text-sm text-red-800">
                Different category activities scheduled at the same time.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">
            All time windows are properly scheduled without conflicts. Your plan
            is ready for approval.
          </p>
        </div>
      )}

      {hasConflicts && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Next Steps:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Review the highlighted time windows below</li>
            <li>• Use edit or delete actions to resolve conflicts</li>
            <li>• Approve your plan once all conflicts are resolved</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ConflictSummary;
