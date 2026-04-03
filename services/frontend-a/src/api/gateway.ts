import type { CreatedUser } from "@easy-devops/user-panel";
import type { LogEntry } from "@easy-devops/log-panel";

function apiPrefix(): string {
  const v = import.meta.env.VITE_API_PREFIX;
  return typeof v === "string" && v.length > 0 ? v : "/api";
}

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return typeof body.error === "string" ? body.error : res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function createUser(
  username: string,
  email: string,
): Promise<CreatedUser> {
  const res = await fetch(`${apiPrefix()}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email }),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return (await res.json()) as CreatedUser;
}

export async function fetchAuditLogs(): Promise<LogEntry[]> {
  const res = await fetch(`${apiPrefix()}/audit-logs`);
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) {
    throw new Error("invalid audit log response");
  }
  return data as LogEntry[];
}
