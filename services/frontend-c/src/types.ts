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
