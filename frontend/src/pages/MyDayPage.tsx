import React, { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import { getDailyPlanByDate, getYesterdayDailyPlan } from '../services/dailyPlanService';
import { DailyPlanResponse, DailyPlanAllocationResponse } from '../types/dailyPlan';
import { formatMinutesToHHMM, formatDurationFromMinutes } from '../lib/utils';
import { Task } from '../types/task';


const MyDayPage: React.FC = () => {
  const [dailyPlan, setDailyPlan] = useState<DailyPlanResponse | null>(null);
  const [yesterdayPlan, setYesterdayPlan] = useState<DailyPlanResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const fetchPlans = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const today = new Date();
      const planDateISO = today.toISOString();
      const data = await getDailyPlanByDate(planDateISO);
      setDailyPlan(data);

      if (!data) {
        const yesterdayData = await getYesterdayDailyPlan();
        setYesterdayPlan(yesterdayData);
      }
    } catch (err: any) {
      if (err.response?.status !== 404) {
        setError('Failed to fetch plans.');
        console.error(err);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <p className="text-slate-700 text-lg">Loading daily plan...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <p className="text-red-500 text-lg">{error}</p>
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
              <button
                className="flex items-center justify-center gap-2 min-w-[84px] cursor-pointer rounded-lg h-10 px-4 bg-blue-600 text-white text-sm font-medium shadow-sm hover:bg-blue-700 transition-colors"
                onClick={() => console.log('Save plan action for:', dailyPlan.id)}
              >
                <SaveOutlinedIcon sx={{ fontSize: '1.125rem' }} />
                Save
              </button>
            </header>
            <main className="flex flex-row gap-2 md:gap-8">
              <section className="flex-1 space-y-4">
                {dailyPlan.allocations && dailyPlan.allocations.length > 0 ? (
                  dailyPlan.allocations
                    .slice() // Create a copy before sorting to avoid mutating the original state
                    .sort((a, b) => a.time_window.start_time - b.time_window.start_time)
                    .map(alloc => (
                      <TimeWindowCard key={alloc.time_window.id} allocation={alloc} />
                    ))
                ) : (
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 text-center min-h-[200px] flex flex-col items-center justify-center">
                    <p className="text-lg text-slate-500 mb-2">No time windows planned for today.</p>
                    <p className="text-sm text-slate-500">You can add time windows to your plan by editing it.</p>
                  </div>
                )}
              </section>
            </main>
          </>
        ) : (
          // Review & Reflect View (when no plan for today)
          <>
            <header className="text-center mb-12">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                Daily Planning
              </h1>
              <p className="text-slate-600 text-lg max-w-2xl mx-auto">
                Review yesterday's progress, plan today's schedule, and reflect on your journey.
              </p>
            </header>

            <div className="space-y-16">
              {/* Section 1: Review Unfinished Tasks */}
              {yesterdayPlan && !yesterdayPlan.reviewed && (
                <section className="w-full">
                  <div className="max-w-6xl mx-auto">
                    <header className="mb-6">
                      <h2 className="text-2xl font-semibold text-slate-800 mb-2">
                        Review: Yesterday's Tasks
                      </h2>
                    </header>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                      <p className="text-slate-700">Tasks list will go here.</p>
                    </div>
                  </div>
                </section>
              )}

              {/* Section 2: Today's Schedule (Create Plan Prompt) */}
              <section className="w-full">
                <div className="max-w-7xl mx-auto">
                  <header className="mb-6">
                    <h2 className="text-2xl font-semibold text-slate-800 mb-2">Today's Schedule</h2>
                    <p className="text-slate-500 text-sm">Plan your day, drag and drop tasks, and manage your time windows.</p>
                  </header>
                  <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center min-h-[300px] flex flex-col items-center justify-center">
                    <h3 className="text-slate-800 text-xl font-semibold mb-2">No plan for today</h3>
                    <p className="text-slate-600 text-sm max-w-md mb-6">
                      Create a plan from a Day Template or start from scratch to organize your tasks and boost your productivity.
                    </p>
                    <button
                      className="flex items-center justify-center gap-2 min-w-[84px] cursor-pointer rounded-lg h-10 px-4 bg-blue-600 text-white text-sm font-medium shadow-sm hover:bg-blue-700 transition-colors"
                      onClick={() => console.log('Create plan action')}
                    >
                      <AddCircleOutlineOutlinedIcon sx={{ fontSize: '1.125rem' }} />
                      Create Plan
                    </button>
                  </div>
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
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
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
    </main>
  );
};

interface TimeWindowCardProps {
  allocation: DailyPlanAllocationResponse;
}

const TimeWindowCard: React.FC<TimeWindowCardProps> = ({ allocation }) => {
  const { time_window, tasks } = allocation;
  const categoryColor = time_window.category?.color || '#A0AEC0'; // Default to a neutral gray
  const durationMinutes = time_window.end_time - time_window.start_time;

  // Create a light background color from the category hex color
  const lightBgColor = categoryColor + '20'; // Add 20 for ~12% opacity in hex

  return (
    <div
      className="p-4 md:p-6 rounded-xl shadow-lg border-2"
      style={{ borderColor: categoryColor, backgroundColor: lightBgColor }}
    >
      <header className="mb-4">
        <h3 className="text-xl md:text-2xl font-bold mb-1" style={{ color: categoryColor }}>{time_window.name}</h3>
        <div className="flex items-center text-sm md:text-base" style={{ color: categoryColor }}>
          <span className="font-medium">
            {formatMinutesToHHMM(time_window.start_time)} - {formatMinutesToHHMM(time_window.end_time)}
          </span>
          <span className="ml-3 px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: categoryColor + '33' }}>
            {formatDurationFromMinutes(durationMinutes)}
          </span>
        </div>
      </header>
      {tasks.length > 0 ? (
        <ul className="space-y-2">
          {tasks.map((task: Task) => (
            <li
              key={task.id}
              className="bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 shadow-sm"
            >
              {task.title}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm italic" style={{ color: categoryColor }}>No tasks in this time window.</p>
      )}
    </div>
  );
};

export default MyDayPage;
