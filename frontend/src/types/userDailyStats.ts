export interface UserDailyStats {
  date: string; // ISO datetime string
  total_seconds_spent: number;
  pomodoros_completed: number;
}
