import { cleanUrl } from "./util.js";
import { getSessionId } from "./session.js";
import { createQueue } from "./queue.js";
import { setupErrorCapture } from "./capture/errors.js";
import { setupNetworkCapture } from "./capture/network.js";
import { setupTimingCapture } from "./capture/timing.js";
import {
  conservativeDefaults,
  fetchRemoteConfig,
  resolveConfig,
} from "./config.js";

var BASE_URL = "https://api.noctris.io/v1";

(async function init() {
  var scriptTag =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName("script");
      return scripts[scripts.length - 1];
    })();

  var apiKey = scriptTag.getAttribute("data-noctris-key") || "";

  if (!apiKey) {
    if (window.console && console.warn) {
      console.warn(
        "[noctris-rum] Missing data-noctris-key \u2014 snippet disabled.",
      );
    }
    return;
  }

  // data-noctris-base-url overrides the shared API host for both config + events.
  var baseUrl = (
    scriptTag.getAttribute("data-noctris-base-url") || BASE_URL
  ).replace(/\/+$/, "");

  // Explicit data-attribute overrides win over remote + conservative defaults.
  var attributeOverrides = {};
  if (scriptTag.hasAttribute("data-noctris-capture-query")) {
    attributeOverrides.capture_query =
      scriptTag.getAttribute("data-noctris-capture-query") === "true";
  }
  if (scriptTag.hasAttribute("data-noctris-sample-rate")) {
    var parsedRate = parseFloat(
      scriptTag.getAttribute("data-noctris-sample-rate"),
    );
    if (!isNaN(parsedRate)) attributeOverrides.sample_rate = parsedRate;
  }

  var fallback = conservativeDefaults(baseUrl);
  var remote = await fetchRemoteConfig(apiKey, fallback, baseUrl);
  var config = resolveConfig(fallback, remote, attributeOverrides);

  var captureQuery = !!config.capture_query;
  var sampleRate =
    typeof config.sample_rate === "number" ? config.sample_rate : 0.1;

  var sessionId = getSessionId();

  var queue = createQueue({
    endpoint: config.endpoint,
    apiKey: apiKey,
    flushIntervalMs: config.flush_interval_ms,
    maxBatchSize: config.max_batch_size,
    maxEventsPerFingerprint: config.max_events_per_fingerprint,
  });

  function baseFields() {
    return {
      session_id: sessionId,
      page_url: cleanUrl(window.location.href, captureQuery),
      referrer: document.referrer
        ? cleanUrl(document.referrer, captureQuery)
        : "",
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
