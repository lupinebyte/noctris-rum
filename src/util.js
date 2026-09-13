/**
 * Strip a URL down to origin + pathname unless query-string capture
 * is explicitly enabled. Falls back to the raw string if URL parsing
 * fails (e.g. relative/malformed URLs).
 */
export function cleanUrl(url, captureQuery) {
  try {
    if (captureQuery) return url;
    var u = new URL(url, window.location.href);
    return u.origin + u.pathname;
  } catch (e) {
    return url;
  }
}

/**
 * Build a stable-ish key for grouping repeated events client-side
 * (used for per-session rate limiting) and server-side (used for
 * dashboard grouping / spike detection).
 */
export function fingerprint(eventType, message, source) {
  return eventType + "|" + String(message || "").slice(0, 120) + "|" + (source || "");
}
