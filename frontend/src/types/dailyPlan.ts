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

export interface SelfReflection {
  positive?: string | null;
  negative?: string | null;
  follow_up_notes?: string | null;
}

export interface DailyPlanResponse {
  id: string;
  user_id: string;
  plan_date: string; // ISO datetime string
  self_reflection: SelfReflection;

  time_windows: TimeWindowResponse[];

}
