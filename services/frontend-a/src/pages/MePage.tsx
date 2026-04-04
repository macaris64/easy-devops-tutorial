import { CurrentUserCard } from "@easy-devops/user-panel";
import type { ReactElement } from "react";
import { useCallback, useState } from "react";
import { useAuth } from "../auth/AuthContext";

/**
 * Current session from `/auth/me`, with optional refresh after backend changes.
 */
export function MePage(): ReactElement {
  const { user, refreshMe } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshMe();
    } finally {
      setRefreshing(false);
    }
  }, [refreshMe]);

  return (
    <section className="me-page" data-testid="me-page" aria-labelledby="me-heading">
      <h1 id="me-heading">My account</h1>
      <p className="me-page-hint">
        Profile data is loaded from <code>/auth/me</code> when you open the admin app.
        Refresh if your roles or details changed on the server.
      </p>
      <CurrentUserCard
        user={user}
        onRefresh={onRefresh}
        refreshing={refreshing}
        emptyLabel="No profile loaded."
      />
    </section>
  );
}
