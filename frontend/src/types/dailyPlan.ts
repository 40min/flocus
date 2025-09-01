import { Task } from "./task";
import { TimeWindow } from "./timeWindow";

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
  self_reflection: SelfReflection | null;
  reviewed: boolean;
  time_windows: TimeWindowResponse[];
}

export interface CarryOverTimeWindowRequest {
  source_plan_id: string;
  time_window_id: string;
  target_date: string; // ISO date string (YYYY-MM-DD)
}

export interface PlanApprovalResponse {
  plan: DailyPlanResponse;
  merged: boolean;
  merge_details?: string[] | null;
}
