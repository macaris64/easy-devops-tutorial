import {
  UserSummary,
  type CreatedUser,
} from "@easy-devops/user-panel";
import type { ReactElement } from "react";
import { useCallback, useState } from "react";

export interface UserLookupSectionProps {
  fetchUser: (id: string) => Promise<CreatedUser>;
}

/**
 * Load a user by ID via the gateway (GET /users/:id).
 */
export function UserLookupSection({
  fetchUser,
}: UserLookupSectionProps): ReactElement {
  const [userId, setUserId] = useState("");
  const [user, setUser] = useState<CreatedUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onLookup = useCallback(async () => {
    const id = userId.trim();
    setError(null);
    setUser(null);
    if (!id) {
      setError("Enter a user ID.");
      return;
    }
    setBusy(true);
    try {
      setUser(await fetchUser(id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setBusy(false);
    }
  }, [fetchUser, userId]);

  return (
    <section className="user-lookup-section" aria-labelledby="user-lookup-heading">
      <h2 id="user-lookup-heading">Look up user</h2>
      <p className="user-lookup-hint">
        Fetch a user by UUID from Service-B (via the REST gateway).
      </p>
      <div className="user-lookup-row">
        <label htmlFor="user-lookup-id">User ID</label>
        <input
          id="user-lookup-id"
          name="userId"
          value={userId}
          disabled={busy}
          onChange={(ev) => {
            setUserId(ev.target.value);
          }}
          placeholder="e.g. uuid from create response"
        />
        <button type="button" disabled={busy} onClick={() => void onLookup()}>
          Load
        </button>
      </div>
      {error ? (
        <p className="form-error" role="alert" data-testid="user-lookup-error">
          {error}
        </p>
      ) : null}
      <UserSummary
        user={user}
        emptyLabel={busy ? "Loading…" : "No user loaded."}
      />
    </section>
  );
}
