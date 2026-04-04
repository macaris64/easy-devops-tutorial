import type { ReactElement, ReactNode } from "react";
import { useMemo, useState } from "react";
import type { LogEntry } from "../types";
import { LogTable } from "./LogTable";

export interface LogPanelProps {
  title?: string;
  entries: LogEntry[];
  toolbar?: ReactNode;
  emptyMessage?: string;
}

function safePayloadString(payload: Record<string, unknown> | undefined): string {
  if (payload === undefined || Object.keys(payload).length === 0) {
    return "";
  }
  try {
    return JSON.stringify(payload);
  } catch {
    return "";
  }
}

function entryMatchesFilter(entry: LogEntry, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (needle === "") {
    return true;
  }
  const hay = [
    entry.createdAt,
    entry.method,
    entry.path,
    entry.createdUserId ?? "",
    safePayloadString(entry.payload),
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(needle);
}

/**
 * Log viewer shell: optional title, toolbar, client-side search, and table of entries.
 */
export function LogPanel({
  title = "Logs",
  entries,
  toolbar,
  emptyMessage,
}: LogPanelProps): ReactElement {
  const [filter, setFilter] = useState("");
  const filtered = useMemo(
    () => entries.filter((e) => entryMatchesFilter(e, filter)),
    [entries, filter],
  );
  const resolvedEmpty =
    filtered.length === 0
      ? entries.length === 0
        ? emptyMessage
        : "No entries match your search."
      : emptyMessage;

  return (
    <section className="log-panel" data-testid="log-panel">
      <header className="log-panel-header">
        <h2>{title}</h2>
        <div className="log-panel-toolbar">
          <label className="edp-visually-hidden" htmlFor="log-panel-filter-input">
            Filter log entries
          </label>
          <input
            id="log-panel-filter-input"
            type="search"
            className="log-panel-search"
            placeholder="Search logs…"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
            }}
            data-testid="log-panel-filter"
          />
          {toolbar}
        </div>
      </header>
      <LogTable entries={filtered} emptyMessage={resolvedEmpty} />
    </section>
  );
}
