import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, PlusCircle, ChevronDown, ChevronUp } from "lucide-react";
import type { TimeWindowAllocation } from "../types/dailyPlan";
import type { Task } from "../types/task";
import TimeWindowBalloon from "./TimeWindowBalloon";
import GapIndicator from "./GapIndicator";
import ConflictResolutionPanel from "./ConflictResolutionPanel";
import ConflictSummary from "./ConflictSummary";
import ConflictIndicator from "./ConflictIndicator";
import { cn } from "../utils/utils";

interface ConflictInfo {
  timeWindowIds: string[];
  message: string;
  type: "overlap" | "category_conflict";
}

interface PlanReviewModeProps {
  timeWindows: TimeWindowAllocation[];
  conflicts?: ConflictInfo[];
  onApprove: () => void;
  onEdit: (allocation: TimeWindowAllocation) => void;
  onDelete: (timeWindowId: string) => void;
  onAssignTask: (timeWindowId: string, task: Task) => void;
  onUnassignTask: (timeWindowId: string, taskId: string) => void;
  onCarryOver?: (timeWindowId: string, targetDate: string) => void;
  onAddTimeWindow: () => void;
  dailyPlanId?: string;
  isApproving?: boolean;
}

const PlanReviewMode: React.FC<PlanReviewModeProps> = ({
  timeWindows,
  conflicts = [],
  onApprove,
  onEdit,
  onDelete,
  onAssignTask,
  onUnassignTask,
  onCarryOver,
  onAddTimeWindow,
  dailyPlanId,
  isApproving = false,
}) => {
  const [expandedConflicts, setExpandedConflicts] = useState(true);

  const hasConflicts = conflicts.length > 0;
  const sortedWindows = [...timeWindows].sort(
    (a, b) => a.time_window.start_time - b.time_window.start_time
  );

  const isTimeWindowInConflict = (timeWindowId: string) => {
    return conflicts.some((conflict) =>
      conflict.timeWindowIds.includes(timeWindowId)
    );
  };

  const renderTimeWindowsWithGaps = () => {
    if (!timeWindows || timeWindows.length === 0) {
      return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 text-center min-h-[200px] flex flex-col items-center justify-center">
          <p className="text-lg text-slate-500 mb-2">
            No time windows planned for today.
          </p>
          <p className="text-sm text-slate-500 mb-4">
            Add time windows to create your daily plan.
          </p>
          <Button onClick={onAddTimeWindow} className="flex items-center gap-2">
            <PlusCircle size={18} />
            Add Time Window
          </Button>
        </div>
      );
    }

    const elements: React.ReactNode[] = [];

    sortedWindows.forEach((alloc, index) => {
      // Add gap indicator before this time window (except for the first one)
      if (index > 0) {
        const prevWindow = sortedWindows[index - 1];
        const gapMinutes =
          alloc.time_window.start_time - prevWindow.time_window.end_time;

        if (gapMinutes > 0) {
          elements.push(
            <GapIndicator
              key={`gap-${prevWindow.time_window.id}-${alloc.time_window.id}`}
              durationMinutes={gapMinutes}
            />
          );
        }
      }

      const isInConflict = isTimeWindowInConflict(alloc.time_window.id);
      const conflictType = conflicts.find((c) =>
        c.timeWindowIds.includes(alloc.time_window.id)
      )?.type;

      // Add the time window with enhanced conflict highlighting
      elements.push(
        <div
          key={alloc.time_window.id}
          className={cn(
            "relative",
            isInConflict && "ring-2 ring-red-300 rounded-lg shadow-lg"
          )}
        >
          {isInConflict && (
            <div className="absolute -top-2 -right-2 z-10">
              <ConflictIndicator
                type={conflictType || "overlap"}
                severity="high"
                size="md"
              />
            </div>
          )}
          <TimeWindowBalloon
            timeWindow={alloc.time_window}
            tasks={alloc.tasks}
            onDelete={() => onDelete(alloc.time_window.id)}
            onEdit={() => onEdit(alloc)}
            onAssignTask={(task) => onAssignTask(alloc.time_window.id, task)}
            onUnassignTask={(taskId) =>
              onUnassignTask(alloc.time_window.id, taskId)
            }
            onCarryOver={onCarryOver}
            dailyPlanId={dailyPlanId}
          />
        </div>
      );
    });

    return elements;
  };

  return (
    <div className="space-y-6">
      {/* Plan Review Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-blue-900 mb-2">
              Plan Review Required
            </h2>
            <p className="text-blue-700 text-sm">
              Please review your daily plan and resolve any conflicts before
              approval.
            </p>
          </div>
          <ConflictSummary conflicts={conflicts} variant="compact" />
        </div>
      </div>

      {/* Enhanced Conflict Resolution Section */}
      {hasConflicts && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">
              Conflict Resolution
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedConflicts(!expandedConflicts)}
              className="flex items-center gap-1 text-slate-600 hover:text-slate-900"
            >
              {expandedConflicts ? (
                <>
                  <ChevronUp size={16} />
                  Collapse
                </>
              ) : (
                <>
                  <ChevronDown size={16} />
                  Expand
                </>
              )}
            </Button>
          </div>

          {expandedConflicts && (
            <ConflictResolutionPanel
              conflicts={conflicts}
              timeWindows={timeWindows}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          )}
        </div>
      )}

      {/* Time Windows */}
      <div className="space-y-4">{renderTimeWindowsWithGaps()}</div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-6 border-t border-slate-200">
        <Button
          onClick={onAddTimeWindow}
          variant="secondary"
          className="flex items-center gap-2"
        >
          <PlusCircle size={18} />
          Add Time Window
        </Button>

        <Button
          onClick={onApprove}
          disabled={hasConflicts || isApproving}
          className="flex items-center gap-2 min-w-[140px]"
        >
          {isApproving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Approving...
            </>
          ) : (
            <>
              <CheckCircle size={18} />
              Approve Plan
            </>
          )}
        </Button>
      </div>

      {hasConflicts && (
        <div className="text-center">
          <p className="text-sm text-slate-600">
            Resolve all conflicts above to enable plan approval
          </p>
        </div>
      )}
    </div>
  );
};

export default PlanReviewMode;
