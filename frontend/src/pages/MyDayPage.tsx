import React, { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Save, PlusCircle } from "lucide-react";
import Button from "components/Button";
import {
  createDailyPlan,
  updateDailyPlan as updateDailyPlanService,
} from "../services/dailyPlanService";
import {
  DailyPlanResponse,
  TimeWindowAllocation,
  TimeWindowResponse,
  SelfReflection,
} from "../types/dailyPlan";
import Timeline from "../components/Timeline";
import { DayTemplateResponse } from "../types/dayTemplate";
import Modal from "../components/modals/Modal";
import TimeWindowBalloon from "../components/TimeWindowBalloon";
import { formatDurationFromSeconds } from "../lib/utils";
import { useDailyStats } from "../hooks/useDailyStats";
import CreateTimeWindowModal from "../components/modals/CreateTimeWindowModal";
import { TimeWindow, TimeWindowCreateRequest } from "../types/timeWindow";
import { Task } from "../types/task";
import { useMessage } from "../context/MessageContext";
import { useTodayDailyPlan, usePrevDayDailyPlan } from "../hooks/useDailyPlan";
import { useTemplates } from "../hooks/useTemplates";
import { useCategories } from "../hooks/useCategories";
import { useSharedTimerContext } from "../context/SharedTimerContext";
import EditDailyPlanTimeWindowModal from "components/modals/EditDailyPlanTimeWindowModal";
import SelfReflectionComponent from "components/SelfReflectionComponent";

const MyDayPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showMessage } = useMessage();
  const { stopCurrentTask, currentTaskId } = useSharedTimerContext();

  const { data: fetchedDailyPlan, isLoading: isLoadingTodayPlan } =
    useTodayDailyPlan();
  const { data: prevDayPlan, isLoading: isLoadingPrevDayPlan } =
    usePrevDayDailyPlan(!isLoadingTodayPlan && !fetchedDailyPlan);
  const { data: dayTemplates = [] } = useTemplates();
  const { data: categories = [] } = useCategories();
  const { data: dailyStats } = useDailyStats();

  const [dailyPlan, setDailyPlan] = useState<DailyPlanResponse | null>(null);
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

  const createPlanMutation = useMutation({
    mutationFn: createDailyPlan,
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
    mutationFn: ({ planId, payload }: { planId: string; payload: any }) =>
      updateDailyPlanService(planId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyPlan", "today"] });
      queryClient.invalidateQueries({ queryKey: ["dailyPlan", "prev-day"] });
      showMessage("Plan updated successfully!", "success");
    },
    onError: (error) => {
      showMessage("Failed to update plan.", "error");
    },
  });

  useEffect(() => {
    // When the fetched daily plan changes, update the local state.
    // This allows local modifications before saving.
    if (fetchedDailyPlan) {
      setDailyPlan(fetchedDailyPlan);
    } else {
      setDailyPlan(null);
    }
  }, [fetchedDailyPlan, setDailyPlan]);

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
  }, [prevDayPlan, fetchedDailyPlan, selectedTemplate, setPrevDayReflection]);

  const handleAssignTask = (timeWindowId: string, task: Task) => {
    setDailyPlan((prevPlan) => {
      if (!prevPlan) return null;

      const newTimeWindows = prevPlan.time_windows.map((alloc) => {
        if (alloc.time_window.id === timeWindowId) {
          // Avoid adding duplicates
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

      return {
        ...prevPlan,
        time_windows: newTimeWindows as TimeWindowResponse[],
      };
    });
  };

  const handleUnassignTask = (timeWindowId: string, taskId: string) => {
    if (taskId === currentTaskId) {
      stopCurrentTask();
    }
    setDailyPlan((prevPlan) => {
      if (!prevPlan) return null;

      const newTimeWindows = prevPlan.time_windows.map((alloc) => {
        if (alloc.time_window.id === timeWindowId) {
          return {
            ...alloc,
            tasks: alloc.tasks.filter((task) => task.id !== taskId),
          };
        }
        return alloc;
      });
      return { ...prevPlan, time_windows: newTimeWindows };
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
      // Map time_windows to the expected format for the backend
      const timeWindowsForSave = selectedTemplate.time_windows.map(
        (tw: TimeWindow) => ({
          description: tw.description,
          start_time: tw.start_time,
          end_time: tw.end_time,
          category_id: tw.category?.id || null,
          task_ids: [], // Assuming no tasks are allocated yet when saving from a template
        })
      );

      await createPlanMutation.mutateAsync(timeWindowsForSave);
      setSelectedTemplate(null); // Clear selected template after saving
    } catch (err) {
      // Error handling is done by the mutation's onError callback
    }
  };

  const handleAddTimeWindow = (
    newTimeWindowAllocation: TimeWindowAllocation
  ) => {
    if (dailyPlan) {
      setDailyPlan((prevDailyPlan) => {
        if (!prevDailyPlan) return null;
        return {
          ...prevDailyPlan,
          time_windows: [
            ...prevDailyPlan.time_windows,
            newTimeWindowAllocation,
          ],
        };
      });
    } else {
      // If there's no daily plan yet, create a new one with the added time window
      setDailyPlan({
        id: `temp-daily-plan-${Date.now()}`, // Temporary ID
        user_id: "", // Will be filled on save
        plan_date: new Date().toISOString(),
        self_reflection: { positive: "", negative: "", follow_up_notes: "" }, // Initialize self_reflection

        time_windows: [newTimeWindowAllocation],
      });
    }
  };

  const handleDeleteTimeWindow = (timeWindowId: string) => {
    if (currentTaskId && dailyPlan) {
      const allocationToDelete = dailyPlan.time_windows.find(
        (alloc) => alloc.time_window.id === timeWindowId
      );
      if (allocationToDelete?.tasks.some((task) => task.id === currentTaskId)) {
        stopCurrentTask();
      }
    }

    setDailyPlan((prevDailyPlan) => {
      if (!prevDailyPlan) return null;
      return {
        ...prevDailyPlan,
        time_windows: prevDailyPlan.time_windows.filter(
          (alloc) => alloc.time_window.id !== timeWindowId
        ),
      };
    });
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
    setDailyPlan((prevPlan) => {
      if (!prevPlan) return null;
      const newTimeWindows = prevPlan.time_windows.map((alloc) => {
        if (alloc.time_window.id === updatedData.id) {
          const updatedTimeWindow = {
            ...alloc.time_window,
            description: updatedData.description,
            start_time: updatedData.start_time,
            end_time: updatedData.end_time,
          };
          return { ...alloc, time_window: updatedTimeWindow };
        }
        return alloc;
      });
      return {
        ...prevPlan,
        time_windows: newTimeWindows as TimeWindowResponse[],
      };
    });
  };

  const handleSaveDailyPlan = async () => {
    if (!dailyPlan) {
      showMessage("No daily plan to save.", "error");
      return;
    }

    try {
      const timeWindowsForSave = dailyPlan.time_windows.map((alloc) => ({
        description: alloc.time_window.description,
        start_time: alloc.time_window.start_time,
        end_time: alloc.time_window.end_time,
        category_id: alloc.time_window.category?.id || null,
        task_ids: alloc.tasks.map((task) => task.id),
      }));

      await updatePlanMutation.mutateAsync({
        planId: dailyPlan.id,
        payload: { time_windows: timeWindowsForSave },
      });
      queryClient.invalidateQueries({ queryKey: ["dailyPlan", "today"] });
      queryClient.invalidateQueries({ queryKey: ["dailyPlan", "prev-day"] });
      showMessage("Daily plan saved successfully!", "success");
    } catch (err) {
      showMessage("Failed to save daily plan.", "error");
      console.error("Failed to save daily plan:", err);
    }
  };

  const savePrevDayReflection = async (reflection: SelfReflection) => {
    if (prevDayPlan) {
      await updatePlanMutation.mutateAsync({
        planId: prevDayPlan.id,
        payload: { self_reflection: reflection },
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

  const isLoading = isLoadingTodayPlan || isLoadingPrevDayPlan;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <p className="text-slate-700 text-lg">Loading daily plan...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 rounded-xl">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {dailyPlan ? (
          // Schedule Editor View
          <>
            <header className="flex items-center justify-between mb-8 md:mb-12">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">
                  {format(new Date(dailyPlan.plan_date), "EEEE, MMMM d")}
                </h1>
                <p className="text-slate-600 text-sm md:text-base">
                  Plan your perfect day
                </p>
              </div>
              <div>
                <p className="text-slate-600 text-sm md:text-base">
                  Total time spent today:{" "}
                  {formatDurationFromSeconds(dailyStats?.total_seconds_spent)}
                </p>
              </div>
            </header>
            <main className="flex flex-row gap-8 p-8 rounded-xl shadow-sm">
              <Timeline
                className="ml-6"
                timeWindows={dailyPlan.time_windows
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
                {dailyPlan.time_windows && dailyPlan.time_windows.length > 0 ? (
                  dailyPlan.time_windows
                    .slice()
                    .sort(
                      (a, b) =>
                        a.time_window.start_time - b.time_window.start_time
                    )
                    .map((alloc) => (
                      <TimeWindowBalloon
                        key={alloc.time_window.id}
                        timeWindow={alloc.time_window}
                        tasks={alloc.tasks}
                        onDelete={handleDeleteTimeWindow}
                        onEdit={() => handleOpenEditModal(alloc)}
                        onAssignTask={(task) =>
                          handleAssignTask(alloc.time_window.id, task)
                        }
                        onUnassignTask={(taskId) =>
                          handleUnassignTask(alloc.time_window.id, taskId)
                        }
                      />
                    ))
                ) : (
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 text-center min-h-[200px] flex flex-col items-center justify-center">
                    <p className="text-lg text-slate-500 mb-2">
                      No time windows planned for today.
                    </p>
                    <p className="text-sm text-slate-500">
                      You can add time windows to your plan by editing it.
                    </p>
                  </div>
                )}
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
                  <Button
                    variant="slate"
                    size="medium"
                    onClick={handleSaveDailyPlan}
                    className="flex items-center gap-2"
                  >
                    <Save size={18} />
                    Save
                  </Button>
                </div>
              </section>
            </main>
          </>
        ) : (
          // Review & Reflect View (when no plan for today)
          <>
            <header className="text-center mb-12">
              <h1 className="text-3xl md:text-3xl font-bold mb-4">
                Daily Planning
              </h1>
              <p className="text-slate-400 text-sm max-w-2xl mx-auto">
                Review yesterday's progress, plan today's schedule, and reflect
                on your journey.
              </p>
            </header>

            <div className="space-y-16">
              {/* Section 1: Review Unfinished Tasks */}
              {showYesterdayReview && prevDayPlan && (
                <section className="w-full">
                  <div className="max-w-6xl mx-auto">
                    <header className="mb-6">
                      <h2 className="text-2xl font-semibold text-slate-800 mb-2">
                        Review: Previous Day's Tasks
                      </h2>
                    </header>
                    <div className="bg-slate-100 p-6 rounded-xl shadow-sm border border-slate-200 opacity-70 transition-opacity">
                      <div className="space-y-4">
                        {prevDayPlan.time_windows
                          .slice()
                          .sort(
                            (a, b) =>
                              a.time_window.start_time -
                              b.time_window.start_time
                          )
                          .map((alloc) => (
                            <TimeWindowBalloon
                              key={alloc.time_window.id}
                              timeWindow={alloc.time_window}
                              tasks={alloc.tasks}
                            />
                          ))}
                      </div>
                      <div className="mt-6 flex justify-start gap-4">
                        <Button
                          onClick={handleCarryOver}
                          disabled={
                            createPlanMutation.isPending ||
                            updatePlanMutation.isPending
                          }
                        >
                          Carry over unfinished tasks
                        </Button>
                        <Button
                          onClick={handleCreateNewPlanFromReview}
                          variant="secondary"
                          disabled={
                            createPlanMutation.isPending ||
                            updatePlanMutation.isPending
                          }
                        >
                          Create new plan
                        </Button>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Section 3: Self-Reflection */}
              {showYesterdayReview && prevDayPlan && prevDayReflection && (
                <section className="w-full">
                  <div className="max-w-6xl mx-auto">
                    <header className="mb-6">
                      <h2 className="text-2xl font-semibold text-slate-800 mb-2">
                        Self-Reflection
                      </h2>
                      <p className="text-slate-500 text-sm">
                        Take a moment to reflect on your day.
                      </p>
                    </header>
                    <SelfReflectionComponent
                      reflection={prevDayReflection}
                      onReflectionChange={setPrevDayReflection}
                    />
                  </div>
                </section>
              )}

              {/* Section 2: Create New Plan */}
              {!showYesterdayReview && !selectedTemplate && (
                <section className="w-full">
                  <div className="max-w-7xl mx-auto">
                    <header className="mb-6">
                      <h2 className="text-2xl font-semibold text-slate-800 mb-2">
                        No plan for today
                      </h2>
                      <p className="text-slate-500 text-sm">
                        Start by creating a new daily plan.
                      </p>
                    </header>
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center min-h-[300px] flex flex-col items-center justify-center">
                      {dayTemplates.length > 0 ? (
                        <>
                          <p className="text-lg text-slate-500 mb-4">
                            Choose a template to get started:
                          </p>
                          <div className="flex flex-wrap justify-center gap-4">
                            {dayTemplates.map(
                              (template: DayTemplateResponse) => (
                                <Button
                                  key={template.id}
                                  onClick={() => handleSelectTemplate(template)}
                                  variant="secondary"
                                >
                                  {template.name}
                                </Button>
                              )
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-lg text-slate-500 mb-4">
                            No templates available.
                          </p>
                          <Button
                            onClick={() => setIsTemplateModalOpen(true)}
                            variant="primary"
                          >
                            Create Plan
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* Template Preview Section */}
              {!showYesterdayReview && selectedTemplate && (
                <section className="w-full">
                  <div className="max-w-7xl mx-auto">
                    <header className="mb-6">
                      <h2 className="text-2xl font-semibold text-slate-800 mb-2">
                        Template Preview: {selectedTemplate.name}
                      </h2>
                      <p className="text-slate-500 text-sm">
                        Review your template and save it as today's plan.
                      </p>
                    </header>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                      <div className="space-y-4 mb-6">
                        {selectedTemplate.time_windows
                          .slice()
                          .sort((a, b) => a.start_time - b.start_time)
                          .map((timeWindow) => (
                            <TimeWindowBalloon
                              key={timeWindow.id}
                              timeWindow={timeWindow}
                              tasks={[]}
                            />
                          ))}
                      </div>
                      <div className="flex justify-start gap-4">
                        <Button
                          onClick={handleSavePlan}
                          disabled={createPlanMutation.isPending}
                        >
                          Save Plan
                        </Button>
                        <Button
                          onClick={() => setSelectedTemplate(null)}
                          variant="secondary"
                        >
                          Back to Templates
                        </Button>
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </div>
            <footer className="mt-16 pt-8 border-t border-slate-200 text-center">
              <p className="text-slate-500 text-sm">
                &copy; {new Date().getFullYear()} Flocus. All rights reserved.
              </p>
            </footer>
          </>
        )}
      </div>

      <Modal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        title="Choose a Day Template"
      >
        <div className="space-y-4">
          {dayTemplates.map((template: DayTemplateResponse) => (
            <Button
              key={template.id}
              onClick={() => handleSelectTemplate(template)}
              variant="secondary"
              className="w-full"
            >
              {template.name}
            </Button>
          ))}
        </div>
      </Modal>

      <CreateTimeWindowModal
        isOpen={isTimeWindowModalOpen}
        onClose={() => setIsTimeWindowModalOpen(false)}
        onSubmitSuccess={handleAddTimeWindow}
        categories={categories}
        existingTimeWindows={dailyPlan?.time_windows || []}
      />

      {dailyPlan && editingTimeWindow && (
        <EditDailyPlanTimeWindowModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          editingTimeWindow={editingTimeWindow}
          onSubmit={handleUpdateTimeWindow}
          existingTimeWindows={dailyPlan.time_windows}
        />
      )}
    </main>
  );
};

export default MyDayPage;
