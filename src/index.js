import { cleanUrl } from "./util.js";
import { getSessionId } from "./session.js";
import { createQueue } from "./queue.js";
import { setupErrorCapture } from "./capture/errors.js";
import { setupNetworkCapture } from "./capture/network.js";
import { setupTimingCapture } from "./capture/timing.js";

(function init() {
  var scriptTag =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName("script");
      return scripts[scripts.length - 1];
    })();

  var apiKey = scriptTag.getAttribute("data-noctris-key") || "";
  var endpoint = scriptTag.getAttribute("data-noctris-endpoint") || "https://ingest.noctris.io/rum/events";
  var captureQuery = scriptTag.getAttribute("data-noctris-capture-query") === "true";
  var sampleRate = parseFloat(scriptTag.getAttribute("data-noctris-sample-rate") || "1");

  if (!apiKey) {
    if (window.console && console.warn) {
      console.warn("[noctris-rum] Missing data-noctris-key \u2014 snippet disabled.");
    }
    return;
  }

  var sessionId = getSessionId();

  var queue = createQueue({
    endpoint: endpoint,
    apiKey: apiKey,
    flushIntervalMs: 5000,
    maxBatchSize: 20,
    maxEventsPerFingerprint: 5,
  });

  function baseFields() {
    return {
      session_id: sessionId,
      page_url: cleanUrl(window.location.href, captureQuery),
      referrer: document.referrer ? cleanUrl(document.referrer, captureQuery) : "",
      user_agent: navigator.userAgent,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      timestamp: new Date().toISOString(),
    };
  }

  setupErrorCapture(queue.enqueue, baseFields, captureQuery);
  setupNetworkCapture(queue.enqueue, baseFields, captureQuery, sampleRate);
  setupTimingCapture(queue.enqueue, baseFields);
})();
