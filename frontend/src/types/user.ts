export interface UserPreferences {
  pomodoro_timeout_minutes: number;
  pomodoro_long_timeout_minutes: number;
  pomodoro_working_interval: number;
  system_notifications_enabled: boolean;
  pomodoro_timer_sound: string;
  theme: string;
}
export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  preferences: UserPreferences;
}

export interface UserUpdatePayload extends Partial<Omit<User, 'id' | 'username' | 'preferences'>> {
  password?: string;
  preferences?: Partial<UserPreferences>;
}
