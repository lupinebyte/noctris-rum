import { cleanUrl, fingerprint } from "../util.js";

/**
 * Patches window.fetch and XMLHttpRequest to observe request outcomes.
 * Failures (status >= 400 or network error) are always captured;
 * successful requests are sampled at `sampleRate` to control volume.
 */
export function setupNetworkCapture(enqueue, baseFields, captureQuery, sampleRate) {
  patchFetch(enqueue, baseFields, captureQuery, sampleRate);
  patchXhr(enqueue, baseFields, captureQuery, sampleRate);
}

function patchFetch(enqueue, baseFields, captureQuery, sampleRate) {
  if (!window.fetch) return;
  var originalFetch = window.fetch;

  window.fetch = function (input, init) {
    var start = performance.now();
    var url = typeof input === "string" ? input : input && input.url;
    var method = (init && init.method) || (input && input.method) || "GET";

    return originalFetch.apply(this, arguments).then(
      function (response) {
        try {
          var duration = performance.now() - start;
          var shouldSample = response.status >= 400 || Math.random() < sampleRate;
          if (shouldSample) {
            var evt = baseFields();
            evt.event_type = response.ok ? "network_timing" : "network_error";
            evt.message = method + " " + cleanUrl(url, captureQuery) + " \u2192 " + response.status;
            evt.request_url = cleanUrl(url, captureQuery);
            evt.http_method = method;
            evt.http_status = response.status;
            evt.duration_ms = Math.round(duration);
            if (!response.ok) {
              evt.fingerprint = fingerprint("network_error", method, url);
            }
            enqueue(evt);
          }
        } catch (e) {
          /* no-op */
        }
        return response;
      },
      function (err) {
        try {
          var duration = performance.now() - start;
          var evt = baseFields();
          evt.event_type = "network_error";
          evt.message =
            method + " " + cleanUrl(url, captureQuery) + " \u2192 " + (err && err.message ? err.message : "request failed");
          evt.request_url = cleanUrl(url, captureQuery);
          evt.http_method = method;
          evt.http_status = 0;
          evt.duration_ms = Math.round(duration);
          evt.fingerprint = fingerprint("network_error", method, url);
          enqueue(evt);
        } catch (e) {
          /* no-op */
        }
        throw err;
      }
    );
  };
}

function patchXhr(enqueue, baseFields, captureQuery, sampleRate) {
  if (!window.XMLHttpRequest) return;
  var origOpen = XMLHttpRequest.prototype.open;
  var origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this.__noctris = { method: method, url: url, start: 0 };
    return origOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function () {
    var xhr = this;
    if (xhr.__noctris) xhr.__noctris.start = performance.now();

    xhr.addEventListener("loadend", function () {
      try {
        if (!xhr.__noctris) return;
        var duration = performance.now() - xhr.__noctris.start;
        var status = xhr.status;
        var shouldSample = status === 0 || status >= 400 || Math.random() < sampleRate;
        if (!shouldSample) return;

        var evt = baseFields();
        evt.event_type = status === 0 || status >= 400 ? "network_error" : "network_timing";
        evt.message =
          xhr.__noctris.method + " " + cleanUrl(xhr.__noctris.url, captureQuery) + " \u2192 " + status;
        evt.request_url = cleanUrl(xhr.__noctris.url, captureQuery);
        evt.http_method = xhr.__noctris.method;
        evt.http_status = status;
        evt.duration_ms = Math.round(duration);
        if (evt.event_type === "network_error") {
          evt.fingerprint = fingerprint("network_error", xhr.__noctris.method, xhr.__noctris.url);
        }
        enqueue(evt);
      } catch (e) {
        /* no-op */
      }
    });

    return origSend.apply(this, arguments);
  };
}
