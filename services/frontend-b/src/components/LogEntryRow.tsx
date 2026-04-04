import type { ReactElement } from "react";
import type { LogEntry } from "../types";

export interface LogEntryRowProps {
  entry: LogEntry;
}

function formatPayload(payload: Record<string, unknown> | undefined): string {
  if (payload === undefined || Object.keys(payload).length === 0) {
    return "—";
  }
  try {
    const s = JSON.stringify(payload);
    return s.length > 240 ? `${s.slice(0, 240)}…` : s;
  } catch {
    return "—";
  }
}

/**
 * Renders a single log row for tables or lists.
 */
export function LogEntryRow({ entry }: LogEntryRowProps): ReactElement {
  return (
    <tr data-testid={`log-row-${entry.id}`}>
      <td>{entry.createdAt}</td>
      <td>
        <code>{entry.method}</code>
      </td>
      <td>{entry.path}</td>
      <td data-testid="log-entry-user-id">{entry.createdUserId ?? "—"}</td>
      <td>
        <code className="log-entry-payload" data-testid="log-entry-payload">
          {formatPayload(entry.payload)}
        </code>
      </td>
    </tr>
  );
}
