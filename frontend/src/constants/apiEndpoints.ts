export const API_ENDPOINTS = {
  LOGIN: '/users/login',
  REGISTER: '/users/register',
  USERS_BASE: '/users', // Used for GET /users/
  USERS_ME: '/users/me',
  USER_BY_ID: (id: string) => `/users/${id}`,
  CATEGORIES_BASE: '/categories',
  CATEGORY_BY_ID: (id: string) => `/categories/${id}`,
  DAY_TEMPLATES_BASE: '/day-templates',
  DAY_TEMPLATE_BY_ID: (id: string) => `/day-templates/${id}`,
  TIME_WINDOWS_BASE: '/time-windows',
  TIME_WINDOW_BY_ID: (id: string) => `/time-windows/${id}`,
  TASKS_BASE: '/tasks',
  TASK_BY_ID: (id: string) => `/tasks/${id}`,
  LLM_IMPROVE_TEXT: '/tasks/llm/improve-text',
  DAILY_PLANS_BASE: '/daily-plans',
  DAILY_PLAN: '/daily-plans',
  DAILY_PLAN_BY_DATE: (planDate: string) => `/daily-plans/${planDate}`,
  DAILY_PLAN_BY_ID: (planId: string) => `/daily-plans/id/${planId}`,
  DAILY_PLAN_UPDATE_BY_ID: (planId: string) => `/daily-plans/${planId}`,
  DAILY_PLAN_PREV_DAY: '/daily-plans/prev-day',
  DAILY_PLAN_TODAY: '/daily-plans/today',
  LLM_IMPROVE_REFLECTION: '/daily-plans/llm/improve-reflection',
  DAILY_STATS_INCREMENT_TIME: '/daily-stats/increment-time',
  DAILY_STATS_INCREMENT_POMODORO: '/daily-stats/increment-pomodoro',
  DAILY_STATS_TODAY: '/daily-stats',
};
