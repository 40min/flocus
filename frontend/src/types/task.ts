import { Category } from './category';

export interface TaskStatistics {
  was_taken_at?: string;    // ISO datetime string
  was_started_at?: string;  // ISO datetime string
  was_stopped_at?: string;  // ISO datetime string
  lasts_seconds?: number;
}

export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high';

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

export type LlmAction = 'improve_title' | 'improve_description' | 'generate_description_from_title';

export interface LLMImprovementRequest {
  action: LlmAction;
  title?: string;
  description?: string;
}

export interface LLMImprovementResponse {
  improved_title?: string | null;
  improved_description?: string | null;
}
