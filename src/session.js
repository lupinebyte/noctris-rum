export function generateId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0;
    var v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * One ID per tab session. Falls back to a per-load ID if sessionStorage
 * is unavailable (private browsing in some browsers, sandboxed iframes).
 */
export function getSessionId() {
  try {
    var id = sessionStorage.getItem("noctris_rum_sid");
    if (!id) {
      id = generateId();
      sessionStorage.setItem("noctris_rum_sid", id);
    }
    return id;
  } catch (e) {
    return generateId();
  }
}
