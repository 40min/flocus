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
};
