import { Category } from './category';

export interface TimeWindow {
  id: string;
  name: string;
  start_time: number; // minutes since midnight
  end_time: number; // minutes since midnight
  category: Category; // Assuming Category type is defined elsewhere
  day_template_id: string;
  user_id: string;
  is_deleted: boolean;
}

export interface TimeWindowCreateRequest {
  name?: string;
  start_time: number;
  end_time: number;
  category: string; // category_id
  day_template_id: string;
}

export interface TimeWindowUpdateRequest {
  name?: string;
  start_time?: number;
  end_time?: number;
  category?: string; // category_id
}
