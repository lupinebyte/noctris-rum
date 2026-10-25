/**
 * Creates a batching queue that:
 *  - buffers events in memory
 *  - flushes on an interval, when the batch fills up, or on tab-hide
 *  - rate-limits repeated identical events per session (error storms)
 *  - uses fetch(keepalive) so flushes can complete after unload
 */
export function createQueue(config) {
  var endpoint = config.endpoint;
  var apiKey = config.apiKey;
  var flushIntervalMs = config.flushIntervalMs;
  var maxBatchSize = config.maxBatchSize;
  var maxEventsPerFingerprint = config.maxEventsPerFingerprint;

  var queue = [];
  var fingerprintCounts = {};

  function enqueue(event) {
    var fp = event.fingerprint;
    if (fp) {
      fingerprintCounts[fp] = (fingerprintCounts[fp] || 0) + 1;
      if (fingerprintCounts[fp] > maxEventsPerFingerprint) return;
    }
    queue.push(event);
    if (queue.length >= maxBatchSize) flush();
  }

  function flush() {
    if (queue.length === 0) return;
    var payload = JSON.stringify({ api_key: apiKey, events: queue });
    queue = [];

    try {
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
        credentials: "omit",
      }).catch(function () {
        /* swallow — don't retry, avoid loops */
      });
    } catch (e) {
      /* no-op */
    }
  }

  var intervalHandle = setInterval(flush, flushIntervalMs);

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") flush();
  });
  window.addEventListener("pagehide", function () {
    flush();
  });

  return {
    enqueue: enqueue,
    flush: flush,
    _stop: function () {
      clearInterval(intervalHandle);
    }, // exposed for tests
  };
}
