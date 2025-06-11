import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Save, PlusCircle } from 'lucide-react';
import { createDailyPlan, updateDailyPlan } from '../services/dailyPlanService';
import { DailyPlanResponse, TimeWindowAllocation, TimeWindowResponse } from '../types/dailyPlan';
import { DayTemplateResponse } from '../types/dayTemplate';
import Modal from '../components/modals/Modal';
import TimeWindowBalloon from '../components/TimeWindowBalloon';
import CreateTimeWindowModal from '../components/modals/CreateTimeWindowModal';
import { TimeWindow } from '../types/timeWindow';
import { Task } from '../types/task';
import { useMessage } from '../context/MessageContext';
import { useTodayDailyPlan, useYesterdayDailyPlan } from '../hooks/useDailyPlan';
import { useTemplates } from '../hooks/useTemplates';
import { useCategories } from '../hooks/useCategories';

const MyDayPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showMessage } = useMessage();

  const { data: fetchedDailyPlan, isLoading: isLoadingTodayPlan } = useTodayDailyPlan();
  const { data: yesterdayPlan, isLoading: isLoadingYesterdayPlan } = useYesterdayDailyPlan(!isLoadingTodayPlan && !fetchedDailyPlan);
  const { data: dayTemplates = [] } = useTemplates();
  const { data: categories = [] } = useCategories();

  const [dailyPlan, setDailyPlan] = useState<DailyPlanResponse | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isTimeWindowModalOpen, setIsTimeWindowModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DayTemplateResponse | null>(null);
  const [showYesterdayReview, setShowYesterdayReview] = useState(false);

  const createPlanMutation = useMutation({
    mutationFn: createDailyPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyPlan', 'today'] });
      setShowYesterdayReview(false);
      showMessage('Daily plan created successfully!', 'success');
    },
    onError: (error) => {
      showMessage('Failed to create daily plan.', 'error');
      console.error('Failed to create daily plan:', error);
    },
  });

  useEffect(() => {
    // When the fetched daily plan changes, update the local state.
    // This allows local modifications before saving.
    setDailyPlan(fetchedDailyPlan ?? null);
  }, [fetchedDailyPlan]);

  useEffect(() => {
    setShowYesterdayReview(!!(yesterdayPlan && !fetchedDailyPlan && !selectedTemplate));
  }, [yesterdayPlan, fetchedDailyPlan, selectedTemplate]);

  const handleAssignTask = (timeWindowId: string, task: Task) => {
    setDailyPlan(prevPlan => {
      if (!prevPlan) return null;

      const newTimeWindows = prevPlan.time_windows.map(alloc => {
        if (alloc.time_window.id === timeWindowId) {
          // Avoid adding duplicates
          if (alloc.tasks.some(existingTask => existingTask.id === task.id)) {
            return alloc;
          }
          return {
            ...alloc,
            tasks: [...alloc.tasks, task],
          };
        }
        return alloc;
      });

      return { ...prevPlan, time_windows: newTimeWindows as TimeWindowResponse[] };
    });
  };

  const handleUnassignTask = (timeWindowId: string, taskId: string) => {
    setDailyPlan(prevPlan => {
      if (!prevPlan) return null;

      const newTimeWindows = prevPlan.time_windows.map(alloc => {
        if (alloc.time_window.id === timeWindowId) {
          return { ...alloc, tasks: alloc.tasks.filter(task => task.id !== taskId) };
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
      console.error('No template selected to save.');
      showMessage('No template selected to save.', 'error');
      return;
    }

    try {
      // Map time_windows to the expected format for the backend
      const timeWindowsForSave = selectedTemplate.time_windows.map((tw: TimeWindow) => ({
        description: tw.description,
        start_time: tw.start_time,
        end_time: tw.end_time,
        category_id: tw.category?.id || null,
        task_ids: [], // Assuming no tasks are allocated yet when saving from a template
      }));

      await createPlanMutation.mutateAsync(timeWindowsForSave);
      setSelectedTemplate(null); // Clear selected template after saving
    } catch (err) {
      // Error handling is done by the mutation's onError callback
    }
  };

  const handleAddTimeWindow = (newTimeWindowAllocation: TimeWindowAllocation) => {
    if (dailyPlan) {
      setDailyPlan(prevDailyPlan => {
        if (!prevDailyPlan) return null;
        return {
          ...prevDailyPlan,
          time_windows: [...prevDailyPlan.time_windows, newTimeWindowAllocation],
        };
      });
    } else {
      // If there's no daily plan yet, create a new one with the added time window
      setDailyPlan({
        id: `temp-daily-plan-${Date.now()}`, // Temporary ID
        user_id: '', // Will be filled on save
        plan_date: new Date().toISOString(),
        reflection_content: null,
        notes_content: null,
        time_windows: [newTimeWindowAllocation],
        reviewed: false,
      });
    }
  };

  const handleDeleteTimeWindow = (timeWindowId: string) => {
    setDailyPlan(prevDailyPlan => {
      if (!prevDailyPlan) return null;
      return {
        ...prevDailyPlan,
        time_windows: prevDailyPlan.time_windows.filter(
          alloc => alloc.time_window.id !== timeWindowId
        ),
      };
    });
  };

  const handleSaveDailyPlan = async () => {
      if (!dailyPlan) {
        showMessage('No daily plan to save.', 'error');
        return;
      }

      try {
        const timeWindowsForSave = dailyPlan.time_windows.map(alloc => ({
          description: alloc.time_window.description,
          start_time: alloc.time_window.start_time,
          end_time: alloc.time_window.end_time,
          category_id: alloc.time_window.category?.id || null,
          task_ids: alloc.tasks.map(task => task.id),
        }));

        await updateDailyPlan(dailyPlan.id, { time_windows: timeWindowsForSave });
        queryClient.invalidateQueries({ queryKey: ['dailyPlan', 'today'] });
        showMessage('Daily plan saved successfully!', 'success');
      } catch (err) {
        showMessage('Failed to save daily plan.', 'error');
        console.error('Failed to save daily plan:', err);
      }
    };

  const isLoading = isLoadingTodayPlan || isLoadingYesterdayPlan;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <p className="text-slate-700 text-lg">Loading daily plan...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {dailyPlan ? (
          // Schedule Editor View
          <>
            <header className="flex items-center justify-between mb-8 md:mb-12">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">
                  {format(new Date(dailyPlan.plan_date), 'EEEE, MMMM d')}
                </h1>
                <p className="text-slate-600 text-sm md:text-base">Plan your perfect day</p>
              </div>
              </header>
            <main className="flex flex-row gap-2 md:gap-8">
              <section className="flex-1 space-y-4">
                {dailyPlan.time_windows && dailyPlan.time_windows.length > 0 ? (
                  dailyPlan.time_windows
                    .slice()
                    .sort((a, b) => a.time_window.start_time - b.time_window.start_time)
                    .map(alloc => (
                      <TimeWindowBalloon
                        key={alloc.time_window.id}
                        timeWindow={alloc.time_window}
                        tasks={alloc.tasks}
                        onDelete={handleDeleteTimeWindow}
                        onAssignTask={task => handleAssignTask(alloc.time_window.id, task)}
                        onUnassignTask={taskId => handleUnassignTask(alloc.time_window.id, taskId)}
                      />
                    ))
                ) : (
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 text-center min-h-[200px] flex flex-col items-center justify-center">
                    <p className="text-lg text-slate-500 mb-2">No time windows planned for today.</p>
                    <p className="text-sm text-slate-500">You can add time windows to your plan by editing it.</p>
                  </div>
                )}
              </section>
            </main>
            <div className="flex justify-start gap-4 mt-8">
              <button
                className="flex items-center justify-center gap-2 min-w-[84px] cursor-pointer rounded-lg h-10 px-4 bg-slate-900 text-white text-sm font-medium shadow-sm hover:bg-slate-800 transition-colors"
                onClick={() => setIsTimeWindowModalOpen(true)}
              >
                <PlusCircle size={18} />
                Add Time Window
              </button>
              <button
                className="flex items-center justify-center gap-2 min-w-[84px] cursor-pointer rounded-lg h-10 px-4 bg-slate-900 text-white text-sm font-medium shadow-sm hover:bg-slate-800 transition-colors"
                onClick={handleSaveDailyPlan}
              >
                <Save size={18} />
                Save
              </button>
            </div>
          </>
        ) : (
          // Review & Reflect View (when no plan for today)
          <>
            <header className="text-center mb-12">
              <h1 className="text-3xl md:text-3xl font-bold mb-4">
                Daily Planning
              </h1>
              <p className="text-slate-400 text-sm max-w-2xl mx-auto">
                Review yesterday's progress, plan today's schedule, and reflect on your journey.
              </p>
            </header>

            <div className="space-y-16">
              {/* Section 1: Review Unfinished Tasks */}
              {showYesterdayReview && yesterdayPlan && !yesterdayPlan.reviewed && (
                <section className="w-full">
                  <div className="max-w-6xl mx-auto">
                    <header className="mb-6">
                      <h2 className="text-2xl font-semibold text-slate-800 mb-2">
                        Review: Yesterday's Tasks
                      </h2>
                    </header>
                    <div className="bg-slate-100 p-6 rounded-xl shadow-sm border border-slate-200 opacity-70 transition-opacity">
                      <div className="space-y-4">
                        {yesterdayPlan.time_windows
                          .slice()
                          .sort((a, b) => a.time_window.start_time - b.time_window.start_time)
                          .map((alloc) => (
                            <TimeWindowBalloon
                              key={alloc.time_window.id}
                              timeWindow={alloc.time_window}
                              tasks={alloc.tasks}
                            />
                          ))}
                      </div>
                      <div className="mt-6 flex justify-start">
                        <button
                          className="flex items-center justify-center gap-2 min-w-[84px] cursor-pointer rounded-lg h-10 px-4 bg-slate-900 text-white text-sm font-medium shadow-sm hover:bg-slate-800 transition-colors"
                          onClick={() => {
                            if (yesterdayPlan) {
                              const timeWindowsToCarryOver = yesterdayPlan.time_windows.map(alloc => ({
                                description: alloc.time_window.description,
                                start_time: alloc.time_window.start_time,
                                end_time: alloc.time_window.end_time,
                                category_id: alloc.time_window.category?.id || null,
                                task_ids: alloc.tasks.filter(task => !task.is_completed).map(task => task.id),
                              }));
                              createPlanMutation.mutate(timeWindowsToCarryOver);
                            }
                          }}
                        >
                          Carry over
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Section 2: Today's Schedule (Create Plan Prompt) */}
              <section className="w-full">
                <div className="max-w-7xl mx-auto">
                  <header className="mb-6">
                    <h2 className="text-md font-semibold text-slate-800 mb-2">Today's Schedule</h2>
                    <p className="text-slate-400 text-sm scale-80 origin-top-left">Plan your day, drag and drop tasks, and manage your time windows.</p>
                  </header>
                  {selectedTemplate ? (
                    <>
                      <div className="space-y-2 mt-8">
                        {selectedTemplate.time_windows
                          .slice()
                          .sort((a: TimeWindow, b: TimeWindow) => a.start_time - b.start_time)
                          .map(tw => (
                            <TimeWindowBalloon key={tw.id} timeWindow={tw} tasks={[]} />
                          ))}
                      </div>
                      <div className="space-y-2 mt-8 text-left">
                        <button
                          className="flex items-center justify-center gap-2 min-w-[84px] cursor-pointer rounded-lg h-10 px-4 bg-slate-900 text-white text-sm font-medium shadow-sm hover:bg-slate-800 transition-colors"
                          onClick={handleSavePlan}
                        >
                          <Save size={18} />
                          Save Plan
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center min-h-[300px] flex flex-col items-center justify-center">
                      <h3 className="text-slate-800 text-xl font-semibold mb-2">No plan for today</h3>
                      <p className="text-slate-600 text-sm max-w-md mb-6">
                        Create a plan from a Day Template or start from scratch to organize your tasks and boost your
                        productivity.
                      </p>
                      <button
                        className="flex items-center justify-center gap-2 min-w-[84px] cursor-pointer rounded-lg h-10 px-4 bg-slate-900 text-white text-sm font-medium shadow-sm hover:bg-slate-800 transition-colors"
                        onClick={() => setIsTemplateModalOpen(true)}
                      >
                        <PlusCircle size={18} />
                        Create Plan
                      </button>
                    </div>
                  )}
                </div>
              </section>

              {/* Section 3: Self-Reflection */}
              {yesterdayPlan && !yesterdayPlan.reviewed && (
                <section className="w-full">
                  <div className="max-w-4xl mx-auto">
                    <header className="mb-6">
                      <h2 className="text-2xl font-semibold text-slate-800 mb-2">Self-Reflection</h2>
                      <p className="text-slate-500 text-sm">Take a moment to reflect on your day.</p>
                    </header>
                    <div className="bg-slate-100 p-6 rounded-xl shadow-sm border border-slate-200 opacity-80 transition-opacity">
                      <p className="text-slate-700">Self-reflection form and tips will go here.</p>
                    </div>
                  </div>
                </section>
              )}
            </div>

            <footer className="mt-16 pt-8 border-t border-slate-200 text-center">
              <p className="text-sm text-slate-500">
                Stay organized, stay productive. Make every day count.
              </p>
            </footer>
          </>
        )}
      </div>
      <Modal isOpen={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} title="Choose a Day Template">
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {dayTemplates.length > 0 ? (
            dayTemplates.map((template: DayTemplateResponse) => (
              <button
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className="w-full text-left p-3 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                <p className="font-semibold">{template.name}</p>
                <p className="text-sm text-slate-600">{template.description || 'No description'}</p>
              </button>
            ))
          ) : (
            <p className="text-slate-600 text-sm">No day templates found. You can create one on the Templates page.</p>
          )}
        </div>
      </Modal>

      <CreateTimeWindowModal
        isOpen={isTimeWindowModalOpen}
        onClose={() => setIsTimeWindowModalOpen(false)}
        onSubmitSuccess={handleAddTimeWindow}
        categories={categories}
        existingTimeWindows={dailyPlan?.time_windows || []}
      />
    </main>
  );
};


export default MyDayPage;
