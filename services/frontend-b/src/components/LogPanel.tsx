import type { ReactElement, ReactNode } from "react";
import type { LogEntry } from "../types";
import { LogTable } from "./LogTable";

export interface LogPanelProps {
  title?: string;
  entries: LogEntry[];
  toolbar?: ReactNode;
  emptyMessage?: string;
}

/**
 * Log viewer shell: optional title, toolbar, and table of entries.
 */
export function LogPanel({
  title = "Logs",
  entries,
  toolbar,
  emptyMessage,
}: LogPanelProps): ReactElement {
  return (
    <section className="log-panel" data-testid="log-panel">
      <header className="log-panel-header">
        <h2>{title}</h2>
        {toolbar ? <div className="log-panel-toolbar">{toolbar}</div> : null}
      </header>
      <LogTable entries={entries} emptyMessage={emptyMessage} />
    </section>
  );
}
