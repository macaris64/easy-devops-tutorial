/** One row in an audit or application log stream. */
export interface LogEntry {
  id: string;
  path: string;
  method: string;
  createdAt: string;
  payload?: Record<string, unknown>;
  createdUserId?: string;
}

/** Catalog row: `event` is the action label (matches JSON `data`, e.g. user.created). */
export interface DomainEventDoc {
  event: string;
  description: string;
  example: Record<string, unknown>;
}
