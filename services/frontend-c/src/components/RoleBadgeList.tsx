import type { ReactElement } from "react";

export interface RoleBadgeListProps {
  roles: string[];
}

/**
 * Simple comma-separated role badges (presentational).
 */
export function RoleBadgeList({ roles }: RoleBadgeListProps): ReactElement {
  if (roles.length === 0) {
    return (
      <span className="role-badge-list-empty" data-testid="role-badge-list-empty">
        No roles
      </span>
    );
  }

  return (
    <ul className="role-badge-list" data-testid="role-badge-list">
      {roles.map((r) => (
        <li key={r} className="role-badge" data-testid={`role-badge-${r}`}>
          {r}
        </li>
      ))}
    </ul>
  );
}
