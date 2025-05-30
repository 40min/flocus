import { TimeWindow, TimeWindowCreateRequest } from './timeWindow';

export interface DayTemplateBase {
  name: string;
  description?: string;
}

export interface DayTemplateCreateRequest extends DayTemplateBase {
  time_windows: string[]; // List of existing TimeWindow IDs
  new_time_windows?: Omit<TimeWindowCreateRequest, 'day_template_id'>[]; // List of new time windows to create
}

export interface DayTemplateUpdateRequest {
  name?: string;
  description?: string;
  time_windows?: string[]; // List of existing TimeWindow IDs to keep/associate
  new_time_windows?: Omit<TimeWindowCreateRequest, 'day_template_id'>[]; // List of new time windows to create and associate
  // Potentially also a list of time window IDs to disassociate/delete, if the backend supports that directly
}

export interface DayTemplateResponse extends DayTemplateBase {
  id: string;
  user_id: string;
  time_windows: TimeWindow[]; // Populated TimeWindow objects
}
