import { LogPanel, type LogEntry } from "@easy-devops/log-panel";
import type { ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import { fetchAuditLogs } from "../api/gateway";

export function LogsPage(): ReactElement {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      setEntries(await fetchAuditLogs());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section>
      <h1>Audit logs</h1>
      {error ? (
        <p className="form-error" role="alert" data-testid="logs-error">
          {error}
        </p>
      ) : null}
      <LogPanel
        title="Recent audit entries"
        entries={entries}
        emptyMessage={loading ? "Loading…" : "No audit entries returned."}
        toolbar={
          <button type="button" disabled={loading} onClick={() => void load()}>
            Refresh
          </button>
        }
      />
    </section>
  );
}
