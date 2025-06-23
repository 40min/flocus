import { useState, useEffect } from 'react';
import { TimeWindow } from '../types/timeWindow';
import { Task } from '../types/task';
import { DailyPlanResponse, TimeWindowResponse } from '../types/dailyPlan';

interface CurrentTimeWindowHook {
  currentTimeWindow: TimeWindow | null;
  currentTasks: Task[];
}

export const useCurrentTimeWindow = (dailyPlan: DailyPlanResponse | null): CurrentTimeWindowHook => {
  const [currentTimeWindow, setCurrentTimeWindow] = useState<TimeWindow | null>(null);
  const [currentTasks, setCurrentTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (!dailyPlan || !dailyPlan.time_windows) {
      setCurrentTimeWindow(null);
      setCurrentTasks([]);
      return;
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    const currentWindowResponse = dailyPlan.time_windows.find((window: TimeWindowResponse) => {
      const start = window.time_window?.start_time;
      const end = window.time_window?.end_time;
      return currentTimeInMinutes >= start && currentTimeInMinutes <= end;
    });

    setCurrentTimeWindow(currentWindowResponse ? currentWindowResponse.time_window : null);
    setCurrentTasks(currentWindowResponse ? currentWindowResponse.tasks : []);
  }, [dailyPlan]);

  return { currentTimeWindow, currentTasks };
};
