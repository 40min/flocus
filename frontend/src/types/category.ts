export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  user_id: string;
  is_deleted: boolean;
}

export interface CategoryCreateRequest {
  name: string;
  description?: string;
  color?: string;
}

export interface CategoryUpdateRequest {
  name?: string;
  description?: string;
  color?: string;
}
