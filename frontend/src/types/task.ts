import { Category } from './category';

export interface TaskStatistics {
  was_taken_at?: string;    // ISO datetime string
  was_started_at?: string;  // ISO datetime string
  was_stopped_at?: string;  // ISO datetime string
  lasts_min?: number;
}

export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface TaskResponse {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string | null; // ISO date string YYYY-MM-DD
  category_id?: string;
  category?: Category; // Populated by backend
  user_id: string;
  created_at?: string; // ISO datetime string
  updated_at?: string; // ISO datetime string
  is_deleted?: boolean;
  statistics?: TaskStatistics;
  is_completed?: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string | null; // ISO date string YYYY-MM-DD
  category_id?: string;
  category?: Category; // Populated by backend
  user_id: string;
  created_at?: string; // ISO datetime string
  updated_at?: string; // ISO datetime string
  is_deleted?: boolean;
  statistics?: TaskStatistics;
  is_completed?: boolean;
}

export interface TaskCreateRequest {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string | null;
  category_id?: string | undefined;
}

export interface TaskUpdateRequest extends Partial<TaskCreateRequest> {
  // All fields are optional for updates
}
