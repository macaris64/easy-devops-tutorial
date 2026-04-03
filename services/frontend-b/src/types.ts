/** One row in an audit or application log stream. */
export interface LogEntry {
  id: string;
  path: string;
  method: string;
  createdAt: string;
  payload?: Record<string, unknown>;
  createdUserId?: string;
}
