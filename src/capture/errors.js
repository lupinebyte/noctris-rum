import { cleanUrl, fingerprint } from "../util.js";

/**
 * Wraps window.onerror and unhandledrejection. Chains any existing
 * handlers rather than replacing them — host pages may already have
 * their own error reporting.
 */
export function setupErrorCapture(enqueue, baseFields, captureQuery) {
  var existingOnError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    try {
      var evt = baseFields();
      evt.event_type = "js_error";
      evt.message = String(message).slice(0, 500);
      evt.source_url = source ? cleanUrl(source, captureQuery) : "";
      evt.line = lineno || 0;
      evt.column = colno || 0;
      evt.stack = error && error.stack ? String(error.stack).slice(0, 2000) : "";
      evt.fingerprint = fingerprint("js_error", message, source + ":" + lineno);
      enqueue(evt);
    } catch (e) {
      /* never throw from the error handler itself */
    }
    if (typeof existingOnError === "function") {
      return existingOnError.apply(this, arguments);
    }
    return false;
  };

  var existingOnRejection = window.onunhandledrejection;
  window.addEventListener("unhandledrejection", function (event) {
    try {
      var reason = event.reason;
      var message =
        reason && reason.message
          ? reason.message
          : typeof reason === "string"
          ? reason
          : "Unhandled promise rejection";
      var evt = baseFields();
      evt.event_type = "unhandled_rejection";
      evt.message = String(message).slice(0, 500);
      evt.stack = reason && reason.stack ? String(reason.stack).slice(0, 2000) : "";
      evt.fingerprint = fingerprint("unhandled_rejection", message, "");
      enqueue(evt);
    } catch (e) {
      /* no-op */
    }
    if (typeof existingOnRejection === "function") {
      existingOnRejection.call(window, event);
    }
  });
}
