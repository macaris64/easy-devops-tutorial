import type { DomainEventDoc } from "./types";

const ts = "2026-04-04T12:00:00.000Z";

/** Card `event` field is the `data` discriminant (e.g. user.created). Payload uses aggregate `event` + `data`. */
export const domainEventCatalog: DomainEventDoc[] = [
  {
    event: "user.created",
    description: "New user from admin CreateUser or public Register.",
    example: {
      event: "user",
      data: "user.created",
      user_id: "uuid",
      username: "alice",
      email: "alice@example.com",
      source: "admin",
      timestamp: ts,
    },
  },
  {
    event: "user.updated",
    description: "Admin updated username, email, or password.",
    example: {
      event: "user",
      data: "user.updated",
      user_id: "uuid",
      username: "alice",
      email: "alice@example.com",
      timestamp: ts,
    },
  },
  {
    event: "user.deleted",
    description: "Admin soft-deleted a user.",
    example: {
      event: "user",
      data: "user.deleted",
      user_id: "uuid",
      username: "alice",
      email: "alice@example.com",
      timestamp: ts,
    },
  },
  {
    event: "user.login",
    description: "Successful password login.",
    example: {
      event: "user",
      data: "user.login",
      user_id: "uuid",
      username: "alice",
      timestamp: ts,
    },
  },
  {
    event: "user.logout",
    description: "Refresh token revoked (JWT required).",
    example: {
      event: "user",
      data: "user.logout",
      user_id: "uuid",
      timestamp: ts,
    },
  },
  {
    event: "user.password_reset_requested",
    description: "Reset token stored for an existing email.",
    example: {
      event: "user",
      data: "user.password_reset_requested",
      user_id: "uuid",
      timestamp: ts,
    },
  },
  {
    event: "user.password_reset_completed",
    description: "Password changed via valid reset token.",
    example: {
      event: "user",
      data: "user.password_reset_completed",
      user_id: "uuid",
      timestamp: ts,
    },
  },
  {
    event: "role.created",
    description: "Admin created a role.",
    example: {
      event: "role",
      data: "role.created",
      role_id: "uuid",
      name: "editor",
      timestamp: ts,
    },
  },
  {
    event: "role.updated",
    description: "Admin renamed a role.",
    example: {
      event: "role",
      data: "role.updated",
      role_id: "uuid",
      name: "editor",
      timestamp: ts,
    },
  },
  {
    event: "role.deleted",
    description: "Admin deleted a role.",
    example: {
      event: "role",
      data: "role.deleted",
      role_id: "uuid",
      name: "editor",
      timestamp: ts,
    },
  },
  {
    event: "user.role_assigned",
    description: "Admin attached a role to a user.",
    example: {
      event: "user",
      data: "user.role_assigned",
      user_id: "uuid",
      role_id: "uuid",
      timestamp: ts,
    },
  },
  {
    event: "user.role_removed",
    description: "Admin removed a role from a user.",
    example: {
      event: "user",
      data: "user.role_removed",
      user_id: "uuid",
      role_id: "uuid",
      timestamp: ts,
    },
  },
];
