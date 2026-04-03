import type { ReactElement } from "react";
import type { LogEntry } from "../types";

export interface LogEntryRowProps {
  entry: LogEntry;
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
      <td>{entry.createdUserId ?? "—"}</td>
    </tr>
  );
}
