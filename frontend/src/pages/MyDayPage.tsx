import React, { useEffect, useState, useCallback } from 'react';
import { getDailyPlanByDate } from '../services/dailyPlanService';
import { DailyPlanResponse } from '../types/dailyPlan';

const MyDayPage: React.FC = () => {
  const [dailyPlan, setDailyPlan] = useState<DailyPlanResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDailyPlanForToday = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const today = new Date();
      const planDateISO = today.toISOString();
      const data = await getDailyPlanByDate(planDateISO);
      setDailyPlan(data);
    } catch (err) {
      if (err instanceof Error && (err as any).response?.status === 404) {
        setDailyPlan(null);
      } else {
        setError('Failed to fetch daily plan.');
        console.error(err);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDailyPlanForToday();
  }, [fetchDailyPlanForToday]);
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
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
          <section className="w-full">
            <div className="max-w-6xl mx-auto">
              <header className="mb-6">
                <h2 className="text-2xl font-semibold text-slate-800 mb-2">
                  Review: Yesterday's Unfinished Tasks
                </h2>
                <p className="text-slate-500 text-sm">
                  Placeholder for unfinished tasks from yesterday.
                </p>
              </header>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <p className="text-slate-700">Unfinished tasks list will go here.</p>
              </div>
            </div>
          </section>

          {/* Section 2: Today's Schedule */}
          <section className="w-full">
            <div className="max-w-7xl mx-auto">
               <header className="mb-6">
                <h2 className="text-2xl font-semibold text-slate-800 mb-2">
                  Today's Schedule
                </h2>
                <p className="text-slate-500 text-sm">
                  Plan your day, drag and drop tasks, and manage your time windows.
                </p>
              </header>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 min-h-[300px]">
                {isLoading && <p className="text-slate-700">Loading today's plan...</p>}
                {error && <p className="text-red-500">{error}</p>}
                {!isLoading && !error && dailyPlan && (
                  <div>
                    <h4 className="text-lg font-semibold">Plan for {new Date(dailyPlan.plan_date).toLocaleDateString()}</h4>
                    <pre className="text-xs bg-slate-100 p-2 rounded mt-2 overflow-auto">
                      {JSON.stringify(dailyPlan, null, 2)}
                    </pre>
                  </div>
                )}
                {!isLoading && !error && !dailyPlan && (
                  <p className="text-slate-700">No plan found for today. You can create one!</p>
                )}
              </div>
            </div>
          </section>

          {/* Section 3: Self-Reflection */}
          <section className="w-full">
            <div className="max-w-4xl mx-auto">
              <header className="mb-6">
                <h2 className="text-2xl font-semibold text-slate-800 mb-2">
                  Self-Reflection
                </h2>
                <p className="text-slate-500 text-sm">
                  Take a moment to reflect on your day.
                </p>
              </header>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <p className="text-slate-700">Self-reflection form and tips will go here.</p>
              </div>
            </div>
          </section>
        </div>

        <footer className="mt-16 pt-8 border-t border-slate-200 text-center">
          <p className="text-sm text-slate-500">
            Stay organized, stay productive. Make every day count.
          </p>
        </footer>
      </div>
    </main>
  );
};

export default MyDayPage;
