import { TaskResponse } from './task';
import { TimeWindow } from './timeWindow';

export interface TimeWindowResponse {
  time_window: TimeWindow;
  tasks: TaskResponse[];
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
