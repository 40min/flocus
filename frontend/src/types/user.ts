export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface UserUpdatePayload extends Partial<User> {
  password?: string;
}
