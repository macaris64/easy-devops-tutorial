import type { ReactElement } from "react";

export interface ProfileUser {
  username: string;
  email: string;
  roles?: string[];
}

export interface ProfileSummaryProps {
  user: ProfileUser | null;
  onLogout?: () => void | Promise<void>;
  emptyLabel?: string;
}

/**
 * Compact profile line with optional logout (presentational).
 */
export function ProfileSummary({
  user,
  onLogout,
  emptyLabel = "Not signed in.",
}: ProfileSummaryProps): ReactElement {
  if (!user) {
    return (
      <p className="profile-summary-empty" data-testid="profile-summary-empty">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="profile-summary" data-testid="profile-summary">
      <span data-testid="profile-summary-text">
        {user.username} ({user.email})
      </span>
      {user.roles && user.roles.length > 0 ? (
        <span className="profile-summary-roles" data-testid="profile-summary-roles">
          {" "}
          — {user.roles.join(", ")}
        </span>
      ) : null}
      {onLogout ? (
        <button
          type="button"
          className="profile-logout"
          data-testid="profile-logout"
          onClick={() => {
            void onLogout();
          }}
        >
          Log out
        </button>
      ) : null}
    </div>
  );
}
