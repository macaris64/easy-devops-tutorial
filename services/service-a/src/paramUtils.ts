/**
 * Express path params may be typed as optional; treat missing as empty.
 */
export function normalizeUserIdParam(raw: string | undefined): string {
  if (raw === undefined) {
    return "";
  }
  return String(raw).trim();
}

/** First non-empty trimmed string from a query value (string or string[]). */
export function pickQueryString(raw: unknown): string | undefined {
  if (typeof raw === "string") {
    const t = raw.trim();
    return t === "" ? undefined : t;
  }
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "string") {
    const t = raw[0].trim();
    return t === "" ? undefined : t;
  }
  return undefined;
}
