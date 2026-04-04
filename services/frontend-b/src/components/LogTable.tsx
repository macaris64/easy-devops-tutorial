import type { ReactElement } from "react";
import type { LogEntry } from "../types";
import { LogEntryRow } from "./LogEntryRow";

export interface LogTableProps {
  entries: LogEntry[];
  emptyMessage?: string;
}

/**
 * Table of log entries with column headers.
 */
export function LogTable({
  entries,
  emptyMessage = "No log entries yet.",
}: LogTableProps): ReactElement {
  if (entries.length === 0) {
    return (
      <p data-testid="log-table-empty" className="log-panel-empty">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="log-table-wrap">
      <table className="log-table" data-testid="log-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Method</th>
            <th>Path</th>
            <th>Created user ID</th>
            <th>Payload</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <LogEntryRow key={e.id} entry={e} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
