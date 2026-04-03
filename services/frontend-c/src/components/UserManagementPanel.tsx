import type { ReactElement } from "react";
import { useCallback, useState } from "react";
import type { CreatedUser } from "../types";
import { UserCreateForm } from "./UserCreateForm";
import { UserSummary } from "./UserSummary";

export interface UserManagementPanelProps {
  title?: string;
  createUser: (username: string, email: string) => Promise<CreatedUser>;
}

/**
 * User management section: create form wired to an async create callback.
 */
export function UserManagementPanel({
  title = "User management",
  createUser,
}: UserManagementPanelProps): ReactElement {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUser, setLastUser] = useState<CreatedUser | null>(null);

  const handleSubmit = useCallback(
    async (payload: { username: string; email: string }) => {
      setError(null);
      setBusy(true);
      try {
        const created = await createUser(payload.username, payload.email);
        setLastUser(created);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "User creation failed";
        setError(msg);
      } finally {
        setBusy(false);
      }
    },
    [createUser],
  );

  return (
    <section className="user-management-panel" data-testid="user-management-panel">
      <h2>{title}</h2>
      <UserCreateForm
        onSubmit={handleSubmit}
        disabled={busy}
        errorMessage={error}
      />
      <UserSummary user={lastUser} />
    </section>
  );
}
