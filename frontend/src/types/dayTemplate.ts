import { TimeWindow, TimeWindowInput } from './timeWindow';

export interface DayTemplateBase {
  name: string;
  description?: string;
}

// For creating a new template. Time windows can be provided during creation.
export interface DayTemplateCreateRequest extends DayTemplateBase {
  time_windows: TimeWindowInput[];
}

// For updating an existing template.
// The provided list of time_windows will replace the existing list.
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
