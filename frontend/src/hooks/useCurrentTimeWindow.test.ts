import { renderHook } from '@testing-library/react';
import { useCurrentTimeWindow } from 'hooks/useCurrentTimeWindow';
import { DailyPlanResponse } from 'types/dailyPlan';
import { Task } from 'types/task';
import { TimeWindow } from 'types/timeWindow';

const mockCategory = { id: 'cat1', name: 'Work', user_id: 'user1', is_deleted: false };
const mockTask1: Task = { id: 'task1', title: 'Task 1', status: 'pending', priority: 'medium', user_id: 'user1' };
const mockTask2: Task = { id: 'task2', title: 'Task 2', status: 'pending', priority: 'medium', user_id: 'user1' };

const mockWindow1: TimeWindow = {
  id: 'w1',
  description: 'Morning Focus',
  start_time: 540, // 09:00
  end_time: 600,   // 10:00
  category: mockCategory,
  day_template_id: 'tpl1',
  user_id: 'user1',
  is_deleted: false,
};

const mockWindow2: TimeWindow = {
  id: 'w2',
  description: 'Afternoon Prep',
  start_time: 780, // 13:00
  end_time: 840,   // 14:00
  category: mockCategory,
  day_template_id: 'tpl1',
  user_id: 'user1',
  is_deleted: false,
};

const mockDailyPlan: DailyPlanResponse = {
  id: 'plan1',
  user_id: 'user1',
  plan_date: new Date().toISOString(),
  reviewed: false,
  time_windows: [
    { time_window: mockWindow1, tasks: [mockTask1] },
    { time_window: mockWindow2, tasks: [mockTask2] },
  ],
};

describe('useCurrentTimeWindow', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  const runHook = (dailyPlan: DailyPlanResponse | null, time: string) => {
    // Set the "current" time for the test. The date doesn't matter, only the time.
    jest.setSystemTime(new Date(`2024-01-15T${time}`));
    const { result } = renderHook(() => useCurrentTimeWindow(dailyPlan));
    return result.current;
  };

  test('should return null when no daily plan is provided', () => {
    const { currentTimeWindow, currentTasks } = runHook(null, '12:00:00');
    expect(currentTimeWindow).toBeNull();
    expect(currentTasks).toEqual([]);
  });

  test('should return null when daily plan has no time windows', () => {
    const planWithNoWindows: DailyPlanResponse = { ...mockDailyPlan, time_windows: [] };
    const { currentTimeWindow, currentTasks } = runHook(planWithNoWindows, '12:00:00');
    expect(currentTimeWindow).toBeNull();
    expect(currentTasks).toEqual([]);
  });

  test('should return null when current time is before any window', () => {
    const { currentTimeWindow, currentTasks } = runHook(mockDailyPlan, '08:00:00');
    expect(currentTimeWindow).toBeNull();
    expect(currentTasks).toEqual([]);
  });

  test('should return null when current time is between windows', () => {
    const { currentTimeWindow, currentTasks } = runHook(mockDailyPlan, '11:30:00');
    expect(currentTimeWindow).toBeNull();
    expect(currentTasks).toEqual([]);
  });

  test('should return null when current time is after all windows', () => {
    const { currentTimeWindow, currentTasks } = runHook(mockDailyPlan, '15:00:00');
    expect(currentTimeWindow).toBeNull();
    expect(currentTasks).toEqual([]);
  });

  test('should return the correct window when current time is inside a window', () => {
    const { currentTimeWindow, currentTasks } = runHook(mockDailyPlan, '09:30:00');
    expect(currentTimeWindow).toEqual(mockWindow1);
    expect(currentTasks).toEqual([mockTask1]);
  });

  test('should return the correct window when current time is exactly at the start', () => {
    const { currentTimeWindow, currentTasks } = runHook(mockDailyPlan, '09:00:00');
    expect(currentTimeWindow).toEqual(mockWindow1);
    expect(currentTasks).toEqual([mockTask1]);
  });

  test('should return the correct window when current time is exactly at the end', () => {
    const { currentTimeWindow, currentTasks } = runHook(mockDailyPlan, '10:00:00');
    expect(currentTimeWindow).toEqual(mockWindow1);
    expect(currentTasks).toEqual([mockTask1]);
  });
});
