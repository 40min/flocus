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
  name: string;
  start_time: number;
  end_time: number;
  category_id?: string; // category_id
}

export interface TimeWindowUpdateRequest {
  name?: string;
  start_time?: number;
  end_time?: number;
  category_id?: string; // category_id
}

// Corresponds to backend's TimeWindowInputSchema
// Used when creating/updating DayTemplates with embedded time windows
export interface TimeWindowInput {
  id?: string; // Optional: Used for updates to identify existing time windows
  name: string;
  category_id: string;
  start_time: number; // minutes since midnight
  end_time: number;   // minutes since midnight
}
