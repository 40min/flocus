export interface UserPreferences {
  pomodoro_timeout_minutes: number;
  system_notifications_enabled: boolean;
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
