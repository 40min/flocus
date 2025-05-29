import { TimeWindow } from './timeWindow';

export interface DayTemplateBase {
  name: string;
  description?: string;
}

export interface DayTemplateCreateRequest extends DayTemplateBase {
  time_windows: string[]; // List of TimeWindow IDs
}

export interface DayTemplateUpdateRequest {
  name?: string;
  description?: string;
  time_windows?: string[]; // List of TimeWindow IDs
}

export interface DayTemplateResponse extends DayTemplateBase {
  id: string;
  user_id: string;
  time_windows: TimeWindow[]; // Populated TimeWindow objects
}
