import { TimeWindow, TimeWindowInput } from './timeWindow';

export interface DayTemplateBase {
  name: string;
  description?: string;
}

// For creating a new template. Time windows are added after initial creation.
export interface DayTemplateCreateRequest extends DayTemplateBase {
  time_windows: TimeWindowInput[];
}

// For updating an existing template.
// Time windows are managed via their own CRUD, then associated here.
export interface DayTemplateUpdateRequest {
  name?: string;
  description?: string;
  time_windows?: TimeWindowInput[]; // List of TimeWindow input objects to be associated/replaced
}

export interface DayTemplateResponse extends DayTemplateBase {
  id: string;
  user_id: string;
  time_windows: TimeWindow[]; // Populated TimeWindow objects
}
