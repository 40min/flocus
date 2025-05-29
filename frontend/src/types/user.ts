export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  token?: string; // Optional: if token is stored with user object in context
}

export interface UserUpdatePayload extends Partial<User> {
  password?: string;
}
