import type { ReactElement } from "react";
import type { CreatedUser } from "../types";

export interface UserSummaryProps {
  user: CreatedUser | null;
  emptyLabel?: string;
}

/**
 * Read-only summary of the last successfully created user.
 */
export function UserSummary({
  user,
  emptyLabel = "No user created in this session yet.",
}: UserSummaryProps): ReactElement {
  if (!user) {
    return (
      <p data-testid="user-summary-empty" className="user-summary-empty">
        {emptyLabel}
      </p>
    );
  }

  return (
    <dl data-testid="user-summary" className="user-summary">
      <dt>ID</dt>
      <dd>{user.id}</dd>
      <dt>Username</dt>
      <dd>{user.username}</dd>
      <dt>Email</dt>
      <dd>{user.email}</dd>
    </dl>
  );
}
