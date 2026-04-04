import type { ReactElement } from "react";
import type { CreatedUser } from "../types";
import { UserSummary } from "./UserSummary";

export interface CurrentUserCardProps {
  /** Current user from `/auth/me` or login payload. */
  user: CreatedUser | null;
  /** Re-fetch profile from the API (e.g. after role changes). */
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
  emptyLabel?: string;
}

/**
 * Session profile card with optional refresh — use in admin “My account” views.
 */
export function CurrentUserCard({
  user,
  onRefresh,
  refreshing = false,
  emptyLabel = "No profile loaded.",
}: CurrentUserCardProps): ReactElement {
  return (
    <section className="current-user-card" data-testid="current-user-card">
      <UserSummary user={user} emptyLabel={emptyLabel} />
      {onRefresh ? (
        <p className="current-user-card-actions">
          <button
            type="button"
            className="current-user-refresh"
            data-testid="current-user-refresh"
            disabled={refreshing}
            onClick={() => {
              void onRefresh();
            }}
          >
            {refreshing ? "Refreshing…" : "Refresh profile"}
          </button>
        </p>
      ) : null}
    </section>
  );
}
