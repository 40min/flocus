import React, { useEffect, useState, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { dayjs } from "../utils/dateUtils";
import { PlusCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createDailyPlan,
  updateDailyPlan as updateDailyPlanService,
} from "../services/dailyPlanService";
import type {
  DailyPlanResponse,
  TimeWindowAllocation,
  SelfReflection,
} from "../types/dailyPlan";
import Timeline from "../components/Timeline";
import type { DayTemplateResponse } from "../types/dayTemplate";
import Modal from "../components/modals/Modal";
import TimeWindowBalloon from "../components/TimeWindowBalloon";
import {
  formatDurationFromSeconds,
  recalculateTimeWindows,
  recalculateTimeWindowsWithShifting,
} from "../utils/utils";
import { useDailyStats } from "../hooks/useDailyStats";
import TimeWindowModal from "../components/modals/TimeWindowModal";
import type { TimeWindow, TimeWindowCreateRequest } from "../types/timeWindow";
import type { Task } from "../types/task";
import { useMessage } from "../context/MessageContext";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  usePrevDayDailyPlan,
  useDailyPlanWithReview,
} from "../hooks/useDailyPlan";
import { useCarryOverIntegration } from "../hooks/useCarryOverIntegration";
import { useTemplates } from "../hooks/useTemplates";
import { useCategories } from "../hooks/useCategories";
import { useTimer } from "../hooks/useTimer";
import SelfReflectionComponent from "components/SelfReflectionComponent";
import GapIndicator from "../components/GapIndicator";
import PlanReviewMode from "../components/PlanReviewMode";

const MyDayPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showMessage } = useMessage();
  const { stopCurrentTask, currentTaskId } = useTimer();

  // Enhanced daily plan management with review state
  const {
    dailyPlan: fetchedDailyPlan,
    isLoading: isLoadingTodayPlan,
    needsReview,
    reviewMode,
    approvePlan,
    isApprovingPlan: isApprovingPlanFromHook,
  } = useDailyPlanWithReview();

  const { data: prevDayPlan, isLoading: isLoadingPrevDayPlan } =
    usePrevDayDailyPlan(!isLoadingTodayPlan && !fetchedDailyPlan);

  // Enhanced carry-over integration
  const {
    carryOverWithTimerIntegration,
    validateCarryOver,
    getTimeWindowCarryOverStatus,
    isCarryingOver,
  } = useCarryOverIntegration();
  const { data: dayTemplates = [] } = useTemplates();
  const { data: categories = [] } = useCategories();
  const { data: dailyStats } = useDailyStats();

  const [dailyPlan, setDailyPlan] = useState<DailyPlanResponse | null>(null);
  const [localTimeWindows, setLocalTimeWindows] = useState<
    TimeWindowAllocation[]
  >([]);
  const [activeAllocation, setActiveAllocation] =
    useState<TimeWindowAllocation | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isTimeWindowModalOpen, setIsTimeWindowModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<DayTemplateResponse | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTimeWindow, setEditingTimeWindow] =
    useState<TimeWindowAllocation | null>(null);
  const [showYesterdayReview, setShowYesterdayReview] = useState(false);
  const [prevDayReflection, setPrevDayReflection] =
    useState<SelfReflection | null>(null);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const [planConflicts, setPlanConflicts] = useState<any[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Use the approving state from the enhanced hook
  const isApprovingPlan = isApprovingPlanFromHook;

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const createPlanMutation = useMutation({
    mutationFn: (timeWindows: any[]) => createDailyPlan(timeWindows),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyPlan", "today"] });
      setShowYesterdayReview(false);
      showMessage("Daily plan created successfully!", "success");
    },
    onError: (error) => {
      showMessage("Failed to create daily plan.", "error");
      console.error("Failed to create daily plan:", error);
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: (updatedTimeWindows: TimeWindowAllocation[]) => {
      if (!dailyPlan) throw new Error("No daily plan to update");
      const payload = {
        time_windows: updatedTimeWindows.map((alloc) => ({
          id: alloc.time_window.id.startsWith("temp-")
            ? undefined
            : alloc.time_window.id,
          description: alloc.time_window.description,
          start_time: alloc.time_window.start_time,
          end_time: alloc.time_window.end_time,
          category_id: alloc.time_window.category.id,
          task_ids: alloc.tasks.map((t) => t.id),
        })),
      };
      return updateDailyPlanService(dailyPlan.id, payload);
    },
    onMutate: async (newTimeWindows) => {
      await queryClient.cancelQueries({ queryKey: ["dailyPlan", "today"] });
      const previousPlan = queryClient.getQueryData<DailyPlanResponse>([
        "dailyPlan",
        "today",
      ]);
      setLocalTimeWindows(newTimeWindows);
      return { previousPlan };
    },
    onSuccess: () => {
      setShowSavedIndicator(true);
      setTimeout(() => setShowSavedIndicator(false), 2000);
    },
    onError: (error, variables, context: any) => {
      if (context?.previousPlan) {
        setLocalTimeWindows(context.previousPlan.time_windows);
      }
      queryClient.invalidateQueries({ queryKey: ["dailyPlan", "today"] });
      showMessage("Failed to update plan.", "error");
      console.error("Failed to update daily plan:", error);
    },
  });

  // Initialize daily plan data only once or when the plan ID changes
  useEffect(() => {
    if (fetchedDailyPlan && !isInitialized) {
      const sortedTimeWindows = [...fetchedDailyPlan.time_windows].sort(
        (a, b) => a.time_window.start_time - b.time_window.start_time
      );
      setDailyPlan({ ...fetchedDailyPlan, time_windows: sortedTimeWindows });
      setLocalTimeWindows(sortedTimeWindows);
      setIsInitialized(true);
    } else if (!fetchedDailyPlan && isInitialized) {
      setDailyPlan(null);
      setLocalTimeWindows([]);
      setIsInitialized(false);
    }
  }, [fetchedDailyPlan, isInitialized]);

  // Update local state when fetched data changes significantly (different plan or review status)
  useEffect(() => {
    if (fetchedDailyPlan && dailyPlan && isInitialized) {
      const fetchedId = fetchedDailyPlan.id;
      const currentId = dailyPlan.id;
      const fetchedReviewed = fetchedDailyPlan.reviewed;
      const currentReviewed = dailyPlan.reviewed;

      // Only update if the plan ID changed or review status changed
      if (fetchedId !== currentId || fetchedReviewed !== currentReviewed) {
        const sortedTimeWindows = [...fetchedDailyPlan.time_windows].sort(
          (a, b) => a.time_window.start_time - b.time_window.start_time
        );
        setDailyPlan({ ...fetchedDailyPlan, time_windows: sortedTimeWindows });
        setLocalTimeWindows(sortedTimeWindows);
      }
    }
  }, [fetchedDailyPlan, dailyPlan, isInitialized]);

  useEffect(() => {
    const shouldShowReview = !!(
      prevDayPlan &&
      !fetchedDailyPlan &&
      !selectedTemplate
    );
    setShowYesterdayReview(shouldShowReview);
    if (shouldShowReview) {
      setPrevDayReflection(prevDayPlan.self_reflection);
    }
  }, [prevDayPlan, fetchedDailyPlan, selectedTemplate]);

  // Debounced save function to prevent duplicate requests
  const debouncedSave = useCallback(
    (timeWindows: TimeWindowAllocation[]) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        if (dailyPlan && isInitialized) {
          updatePlanMutation.mutate(timeWindows);
        }
      }, 300); // 300ms debounce
    },
    [dailyPlan, updatePlanMutation, isInitialized]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleAssignTask = (timeWindowId: string, task: Task) => {
    setLocalTimeWindows((currentWindows) => {
      const updatedWindows = currentWindows.map((alloc) => {
        if (alloc.time_window.id === timeWindowId) {
          if (alloc.tasks.some((existingTask) => existingTask.id === task.id)) {
            return alloc;
          }
          return {
            ...alloc,
            tasks: [...alloc.tasks, task],
          };
        }
        return alloc;
      });

      // Auto-save the changes with debounce only if initialized
      if (isInitialized) {
        debouncedSave(updatedWindows);
      }

      return updatedWindows;
    });
  };

  const handleUnassignTask = (timeWindowId: string, taskId: string) => {
    if (taskId === currentTaskId) {
      stopCurrentTask();
    }
    setLocalTimeWindows((currentWindows) => {
      const updatedWindows = currentWindows.map((alloc) => {
        if (alloc.time_window.id === timeWindowId) {
          return {
            ...alloc,
            tasks: alloc.tasks.filter((task) => task.id !== taskId),
          };
        }
        return alloc;
      });

      // Auto-save the changes with debounce only if initialized
      if (isInitialized) {
        debouncedSave(updatedWindows);
      }

      return updatedWindows;
    });
  };

  const handleSelectTemplate = (template: DayTemplateResponse) => {
    setSelectedTemplate(template);
    setIsTemplateModalOpen(false);
  };

  const handleSavePlan = async () => {
    if (!selectedTemplate) {
      console.error("No template selected to save.");
      showMessage("No template selected to save.", "error");
      return;
    }

    try {
      const timeWindowsForSave = selectedTemplate.time_windows.map(
        (tw: TimeWindow) => ({
          description: tw.description,
          start_time: tw.start_time,
          end_time: tw.end_time,
          category_id: tw.category?.id || null,
          task_ids: [],
        })
      );

      await createPlanMutation.mutateAsync(timeWindowsForSave);
      setSelectedTemplate(null);
    } catch (err) {
      // Error handling is done by the mutation's onError callback
    }
  };

  const handleAddTimeWindow = (
    newTimeWindowAllocation: TimeWindowAllocation
  ) => {
    const updatedTimeWindows = [
      ...localTimeWindows,
      newTimeWindowAllocation,
    ].sort((a, b) => a.time_window.start_time - b.time_window.start_time);
    const recalculatedWindows = recalculateTimeWindows(updatedTimeWindows);
    setLocalTimeWindows(recalculatedWindows);

    // Auto-save the changes with debounce only if initialized
    if (isInitialized) {
      debouncedSave(recalculatedWindows);
    }
  };

  const handleDeleteTimeWindow = (timeWindowId: string) => {
    if (currentTaskId && dailyPlan) {
      const allocationToDelete = localTimeWindows.find(
        (alloc) => alloc.time_window.id === timeWindowId
      );
      if (allocationToDelete?.tasks.some((task) => task.id === currentTaskId)) {
        stopCurrentTask();
      }
    }

    const updatedTimeWindows = localTimeWindows.filter(
      (alloc) => alloc.time_window.id !== timeWindowId
    );
    const recalculatedWindows = recalculateTimeWindows(updatedTimeWindows);
    setLocalTimeWindows(recalculatedWindows);

    // Auto-save the changes with debounce only if initialized
    if (isInitialized) {
      debouncedSave(recalculatedWindows);
    }
  };

  const handleOpenEditModal = (allocation: TimeWindowAllocation) => {
    setEditingTimeWindow(allocation);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditingTimeWindow(null);
    setIsEditModalOpen(false);
  };

  const handleUpdateTimeWindow = (
    updatedData: TimeWindowCreateRequest & { id: string }
  ) => {
    const updatedTimeWindows = localTimeWindows
      .map((alloc) => {
        if (alloc.time_window.id === updatedData.id) {
          return {
            ...alloc,
            time_window: {
              ...alloc.time_window,
              description: updatedData.description,
              start_time: updatedData.start_time,
              end_time: updatedData.end_time,
              category: categories.find(
                (c) => c.id === updatedData.category_id
              )!,
            },
          };
        }
        return alloc;
      })
      .sort((a, b) => a.time_window.start_time - b.time_window.start_time);

    setLocalTimeWindows(updatedTimeWindows);

    // Auto-save the changes with debounce only if initialized
    if (isInitialized) {
      debouncedSave(updatedTimeWindows);
    }
  };

  const savePrevDayReflection = async (reflection: SelfReflection) => {
    if (prevDayPlan) {
      await updateDailyPlanService(prevDayPlan.id, {
        self_reflection: reflection,
      });
    }
  };

  const handleCarryOver = async () => {
    if (prevDayPlan && prevDayReflection) {
      await savePrevDayReflection(prevDayReflection);

      const timeWindowsToCarryOver = prevDayPlan.time_windows.map((alloc) => ({
        description: alloc.time_window.description,
        start_time: alloc.time_window.start_time,
        end_time: alloc.time_window.end_time,
        category_id: alloc.time_window.category?.id || null,
        task_ids: alloc.tasks
          .filter((task) => task.status !== "done")
          .map((task) => task.id),
      }));

      await createPlanMutation.mutateAsync(timeWindowsToCarryOver);
      setShowYesterdayReview(false);
    }
  };

  const handleCreateNewPlanFromReview = async () => {
    if (prevDayPlan && prevDayReflection) {
      await savePrevDayReflection(prevDayReflection);
      setShowYesterdayReview(false);
      setIsTemplateModalOpen(true);
    }
  };

  const handleCarryOverTimeWindow = async (
    timeWindowId: string,
    targetDate: string
  ) => {
    // Validate the carry-over operation first
    const validation = validateCarryOver(timeWindowId, targetDate);
    if (!validation.valid) {
      showMessage(
        validation.reason || "Cannot carry over time window",
        "error"
      );
      return;
    }

    try {
      const result = await carryOverWithTimerIntegration(
        timeWindowId,
        targetDate
      );

      // Remove the carried-over time window from local state immediately
      setLocalTimeWindows((currentWindows) => {
        const updatedWindows = currentWindows.filter(
          (alloc) => alloc.time_window.id !== timeWindowId
        );
        return updatedWindows;
      });

      // Show enhanced success message with details
      let message = "Time window carried over successfully!";
      if (result.timerWasReset) {
        message += " Timer was stopped as the active task was moved.";
      }
      if (result.affectedTasks.length > 0) {
        message += ` ${result.affectedTasks.length} unfinished task(s) moved.`;
      }

      showMessage(message, "success");
    } catch (error) {
      console.error("Failed to carry over time window:", error);
      showMessage("Failed to carry over time window", "error");
    }
  };

  const handleApprovePlan = async () => {
    if (!dailyPlan) {
      showMessage("No daily plan available for approval", "error");
      return;
    }

    setPlanConflicts([]);

    try {
      const response = await approvePlan(localTimeWindows);

      // Update local state with the approved plan
      if (response.plan) {
        const sortedTimeWindows = [...response.plan.time_windows].sort(
          (a, b) => a.time_window.start_time - b.time_window.start_time
        );
        setDailyPlan({ ...response.plan, time_windows: sortedTimeWindows });
        setLocalTimeWindows(sortedTimeWindows);
      }
    } catch (error: any) {
      console.error("Failed to approve plan:", error);

      // Handle conflict errors
      if (error.status === 400 && error.message.includes("conflict")) {
        // Parse conflict information from error message
        setPlanConflicts([
          {
            timeWindowIds: [],
            message: error.message,
            type: "category_conflict" as const,
          },
        ]);
      }
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const activeAlloc = localTimeWindows.find(
      (alloc) => alloc.time_window.id === active.id
    );
    setActiveAllocation(activeAlloc || null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLocalTimeWindows((items) => {
        const oldIndex = items.findIndex(
          (item) => item.time_window.id === active.id
        );
        const newIndex = items.findIndex(
          (item) => item.time_window.id === over.id
        );
        const movedItems = arrayMove(items, oldIndex, newIndex);
        const recalculatedItems = recalculateTimeWindowsWithShifting(
          movedItems,
          newIndex
        );

        // Auto-save the changes with debounce only if initialized
        if (isInitialized) {
          debouncedSave(recalculatedItems);
        }

        return recalculatedItems;
      });
    }
    setActiveAllocation(null);
  }

  // Function to render time windows with gaps
  const renderTimeWindowsWithGaps = () => {
    if (!localTimeWindows || localTimeWindows.length === 0) {
      return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 text-center min-h-[200px] flex flex-col items-center justify-center">
          <p className="text-lg text-slate-500 mb-2">
            No time windows planned for today.
          </p>
          <p className="text-sm text-slate-500">
            You can add time windows to your plan by editing it.
          </p>
        </div>
      );
    }

    const sortedWindows = [...localTimeWindows].sort(
      (a, b) => a.time_window.start_time - b.time_window.start_time
    );

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

      // Add the time window
      elements.push(
        <SortableTimeWindow
          key={alloc.time_window.id}
          allocation={alloc}
          onDelete={() => handleDeleteTimeWindow(alloc.time_window.id)}
          onEdit={() => handleOpenEditModal(alloc)}
          onAssignTask={(task) => handleAssignTask(alloc.time_window.id, task)}
          onUnassignTask={(taskId) =>
            handleUnassignTask(alloc.time_window.id, taskId)
          }
        />
      );
    });

    return elements;
  };

  const isLoading = isLoadingTodayPlan || isLoadingPrevDayPlan;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <p className="text-slate-700 text-lg">Loading daily plan...</p>
      </div>
    );
  }

  const SortableTimeWindow = ({
    allocation,
    onDelete,
    onEdit,
    onAssignTask,
    onUnassignTask,
  }: {
    allocation: TimeWindowAllocation;
    onDelete: () => void;
    onEdit: () => void;
    onAssignTask: (task: Task) => void;
    onUnassignTask: (taskId: string) => void;
  }) => {
    const { attributes, listeners, setNodeRef, transform, transition } =
      useSortable({ id: allocation.time_window.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        data-testid={`sortable-time-window-${allocation.time_window.id}`}
      >
        <TimeWindowBalloon
          timeWindow={allocation.time_window}
          tasks={allocation.tasks}
          onDelete={onDelete}
          onEdit={onEdit}
          onAssignTask={onAssignTask}
          onUnassignTask={onUnassignTask}
          onCarryOver={handleCarryOverTimeWindow}
          dailyPlanId={dailyPlan?.id}
          dragListeners={listeners}
          carryOverStatus={getTimeWindowCarryOverStatus(
            allocation.time_window.id
          )}
          isCarryingOver={isCarryingOver}
        />
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 rounded-xl">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {dailyPlan ? (
          <>
            <header className="flex items-center justify-between mb-8 md:mb-12">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">
                  {dayjs(dailyPlan.plan_date).format("dddd, MMMM D")}
                </h1>
                <p className="text-slate-600 text-sm md:text-base">
                  {reviewMode === "approved"
                    ? "Plan your perfect day"
                    : "Review and approve your plan"}
                </p>
                {needsReview && (
                  <div className="mt-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium inline-block">
                    Plan requires review
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <p className="text-slate-600 text-sm md:text-base">
                  Total time spent today:{" "}
                  {formatDurationFromSeconds(dailyStats?.total_seconds_spent)}
                </p>
                {showSavedIndicator && (
                  <div className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                    <Check size={12} />
                    Saved
                  </div>
                )}
              </div>
            </header>

            {reviewMode === "needs-review" ? (
              // Plan Review Mode - shown when plan needs review
              <main className="max-w-4xl mx-auto">
                <PlanReviewMode
                  timeWindows={localTimeWindows}
                  conflicts={planConflicts}
                  onApprove={handleApprovePlan}
                  onEdit={handleOpenEditModal}
                  onDelete={handleDeleteTimeWindow}
                  onAssignTask={handleAssignTask}
                  onUnassignTask={handleUnassignTask}
                  onCarryOver={handleCarryOverTimeWindow}
                  onAddTimeWindow={() => setIsTimeWindowModalOpen(true)}
                  dailyPlanId={dailyPlan.id}
                  isApproving={isApprovingPlan}
                  getTimeWindowCarryOverStatus={getTimeWindowCarryOverStatus}
                  isCarryingOver={isCarryingOver}
                />
              </main>
            ) : (
              // Standard Daily Plan View - shown when plan is approved
              <main className="flex flex-row gap-8 p-8 rounded-xl shadow-sm">
                <Timeline
                  className="ml-6"
                  timeWindows={localTimeWindows
                    .slice()
                    .sort(
                      (a, b) =>
                        a.time_window.start_time - b.time_window.start_time
                    )
                    .map(({ time_window }) => {
                      const planDate = new Date(dailyPlan.plan_date);
                      const startDate = new Date(
                        planDate.getFullYear(),
                        planDate.getMonth(),
                        planDate.getDate(),
                        0,
                        time_window.start_time
                      );
                      const endDate = new Date(
                        planDate.getFullYear(),
                        planDate.getMonth(),
                        planDate.getDate(),
                        0,
                        time_window.end_time
                      );

                      return {
                        id: time_window.id,
                        start_time: startDate.toISOString(),
                        end_time: endDate.toISOString(),
                        category: {
                          ...time_window.category,
                          color: time_window.category.color || "#A0AEC0",
                        },
                      };
                    })}
                />
                <section className="flex-1 space-y-4">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    data-testid="dnd-context"
                  >
                    <SortableContext
                      items={localTimeWindows.map(
                        (alloc) => alloc.time_window.id
                      )}
                      strategy={verticalListSortingStrategy}
                    >
                      {renderTimeWindowsWithGaps()}
                    </SortableContext>
                    <DragOverlay>
                      {activeAllocation ? (
                        <TimeWindowBalloon
                          timeWindow={activeAllocation.time_window}
                          tasks={activeAllocation.tasks}
                          isOverlay
                          carryOverStatus={getTimeWindowCarryOverStatus(
                            activeAllocation.time_window.id
                          )}
                          isCarryingOver={isCarryingOver}
                        />
                      ) : null}
                    </DragOverlay>
                  </DndContext>

                  <div className="flex justify-start gap-4 mt-8">
                    <Button
                      variant="slate"
                      size="medium"
                      onClick={() => setIsTimeWindowModalOpen(true)}
                      className="flex items-center gap-2"
                    >
                      <PlusCircle size={18} />
                      Add Time Window
                    </Button>
                  </div>
                </section>
              </main>
            )}
          </>
        ) : (
          <>
            <header className="text-center mb-12">
              <h1 className="text-4xl font-bold text-slate-900 mb-2">
                Welcome to Your Day
              </h1>
              <p className="text-lg text-slate-600">
                Let's get your day planned out.
              </p>
            </header>
            <div className="flex justify-center items-start gap-8">
              {showYesterdayReview && prevDayPlan && (
                <section className="w-full">
                  <div className="max-w-6xl mx-auto">
                    <header className="mb-6">
                      <h2 className="text-2xl font-bold text-slate-800">
                        Review Yesterday's Plan
                      </h2>
                    </header>
                    <div className="space-y-4">
                      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-lg mb-2">
                          Completed Tasks
                        </h3>
                        <ul className="list-disc list-inside">
                          {prevDayPlan.time_windows
                            .flatMap(({ tasks }) => tasks)
                            .filter((task) => task.status === "done")
                            .map((task) => (
                              <li key={task.id}>{task.title}</li>
                            ))}
                        </ul>
                      </div>
                      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-lg mb-2">
                          Uncompleted Tasks
                        </h3>
                        <ul className="list-disc list-inside">
                          {prevDayPlan.time_windows
                            .flatMap(({ tasks }) => tasks)
                            .filter((task) => task.status !== "done")
                            .map((task) => (
                              <li key={task.id}>{task.title}</li>
                            ))}
                        </ul>
                      </div>
                      <div className="mt-6 flex justify-start gap-4">
                        <Button
                          onClick={handleCarryOver}
                          variant="slate"
                          size="medium"
                          className="flex items-center gap-2"
                        >
                          Carry Over Uncompleted Tasks
                        </Button>
                        <Button
                          onClick={handleCreateNewPlanFromReview}
                          variant="slate"
                          size="medium"
                          className="flex items-center gap-2"
                        >
                          Create New Plan
                        </Button>
                      </div>
                    </div>
                  </div>
                </section>
              )}
              {showYesterdayReview && prevDayPlan && prevDayReflection && (
                <section className="w-full">
                  <div className="max-w-6xl mx-auto">
                    <header className="mb-6">
                      <h2 className="text-2xl font-bold text-slate-800">
                        Self-Reflection
                      </h2>
                    </header>
                    <SelfReflectionComponent
                      reflection={prevDayReflection}
                      onReflectionChange={setPrevDayReflection}
                    />
                  </div>
                </section>
              )}
              {!showYesterdayReview && !selectedTemplate && (
                <section className="w-full">
                  <div className="max-w-7xl mx-auto">
                    <header className="mb-6">
                      <h2 className="text-2xl font-bold text-slate-800">
                        Choose a Template for Today
                      </h2>
                      <p className="text-slate-600 mt-1">
                        Select one of your pre-defined day templates to get
                        started.
                      </p>
                    </header>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {dayTemplates.map((template: DayTemplateResponse) => (
                        <Button
                          key={template.id}
                          onClick={() => handleSelectTemplate(template)}
                          variant="secondary"
                          className="h-auto text-left p-6 flex flex-col items-start"
                        >
                          <h3 className="font-bold text-lg">{template.name}</h3>
                          <p className="text-sm text-slate-500">
                            {template.description}
                          </p>
                        </Button>
                      ))}
                    </div>
                    <>
                      <Button
                        onClick={() => setIsTemplateModalOpen(true)}
                        className="mt-6"
                      >
                        Or Choose from All Templates
                      </Button>
                    </>
                  </div>
                </section>
              )}
              {!showYesterdayReview && selectedTemplate && (
                <section className="w-full">
                  <div className="max-w-7xl mx-auto">
                    <header className="mb-6">
                      <h2 className="text-2xl font-bold text-slate-800">
                        Today's Plan from: {selectedTemplate.name}
                      </h2>
                      <p className="text-slate-600 mt-1">
                        Here is the layout for your day. Ready to save?
                      </p>
                    </header>
                    <div className="space-y-4">
                      {selectedTemplate.time_windows
                        .slice()
                        .sort((a, b) => a.start_time - b.start_time)
                        .map((timeWindow) => (
                          <TimeWindowBalloon
                            key={timeWindow.id}
                            timeWindow={timeWindow}
                          />
                        ))}
                    </div>
                    <div className="flex justify-start gap-4">
                      <Button onClick={handleSavePlan} className="mt-6">
                        Save Today's Plan
                      </Button>
                      <Button
                        onClick={() => setSelectedTemplate(null)}
                        variant="secondary"
                        className="mt-6"
                      >
                        Choose a Different Template
                      </Button>
                    </div>
                  </div>
                </section>
              )}
            </div>
            <footer className="mt-16 pt-8 border-t border-slate-200 text-center">
              <p className="text-slate-500">
                Flocus - Stay Focused, Stay Productive.
              </p>
            </footer>
          </>
        )}
      </div>
      <Modal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        title="Select a Day Template"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dayTemplates.map((template: DayTemplateResponse) => (
            <Button
              key={template.id}
              onClick={() => handleSelectTemplate(template)}
              variant="secondary"
              className="h-auto text-left p-4"
            >
              <h3 className="font-bold">{template.name}</h3>
              <p className="text-sm text-slate-500">{template.description}</p>
            </Button>
          ))}
        </div>
      </Modal>
      <TimeWindowModal
        isOpen={isTimeWindowModalOpen}
        onClose={() => setIsTimeWindowModalOpen(false)}
        onCreateSuccess={handleAddTimeWindow}
        categories={categories}
        existingTimeWindows={localTimeWindows}
      />
      {dailyPlan && editingTimeWindow && (
        <TimeWindowModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          onEditSubmit={handleUpdateTimeWindow}
          editingTimeWindow={editingTimeWindow}
          categories={categories}
          existingTimeWindows={localTimeWindows}
        />
      )}
    </main>
  );
};

export default MyDayPage;
