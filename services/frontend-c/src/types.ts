/** User returned from the gateway after successful creation. */
export interface CreatedUser {
  id: string;
  username: string;
  email: string;
  /** Present when the API returns RBAC roles (e.g. Service-A user DTO). */
  roles?: string[];
}

/** Role option for assignment UIs. */
export interface RoleOption {
  id: string;
  name: string;
}

/** Alias for role rows in admin CRUD (same as RoleOption). */
export type RoleRecord = RoleOption;

/** Server-side filters for `GET /users` (gateway). */
export type UserListFilters = {
  query?: string;
  role?: string;
};

/** Server-side filters for `GET /roles` (gateway). */
export type RoleListFilters = {
  query?: string;
};
