import { Task } from './task';
import { TimeWindow } from './timeWindow';

export interface TimeWindowAllocation {
  time_window: TimeWindow;
  tasks: Task[];
}

export interface TimeWindowResponse {
  time_window: TimeWindow;
  tasks: Task[];
}

export interface DailyPlanResponse {
  id: string;
  user_id: string;
  plan_date: string; // ISO datetime string
  reflection_content?: string | null;
  notes_content?: string | null;
  time_windows: TimeWindowResponse[];
  reviewed: boolean;
}
