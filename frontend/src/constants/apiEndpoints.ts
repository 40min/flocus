export const API_ENDPOINTS = {
  LOGIN: '/users/login',
  REGISTER: '/users/register',
  USERS_BASE: '/users', // Used for GET /users/
  USERS_ME: '/users/me',
  USER_BY_ID: (id: string) => `/users/${id}`,
};
