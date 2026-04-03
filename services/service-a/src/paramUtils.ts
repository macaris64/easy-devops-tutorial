/**
 * Express path params may be typed as optional; treat missing as empty.
 */
export function normalizeUserIdParam(raw: string | undefined): string {
  if (raw === undefined) {
    return "";
  }
  return String(raw).trim();
}
