/**
 * Remote RUM config fetch with sessionStorage cache and conservative
 * local fallbacks when the config service is unreachable or slow.
 */

var CACHE_KEY = "noctris_rum_config";
var CACHE_TTL_MS = 5 * 60 * 1000;
var FETCH_TIMEOUT_MS = 2000;

/** Shared defaults; `endpoint` is filled in from BASE_URL in index.js. */
export var CONSERVATIVE_DEFAULTS = {
  capture_query: false,
  sample_rate: 0.1,
  flush_interval_ms: 5000,
  max_batch_size: 20,
  max_events_per_fingerprint: 5,
};

/**
 * Build conservative defaults for a given API base URL.
 * Paths: `{baseUrl}/rum/events`
 */
export function conservativeDefaults(baseUrl) {
  return Object.assign({}, CONSERVATIVE_DEFAULTS, {
    endpoint: baseUrl + "/rum/events",
  });
}

/**
 * Fetch org defaults from the config API. Cached in sessionStorage for
 * 5 minutes. Never blocks page load longer than FETCH_TIMEOUT_MS —
 * on any failure returns `fallback` so capture still starts.
 *
 * Config path: `{baseUrl}/rum/config`
 */
export async function fetchRemoteConfig(apiKey, fallback, baseUrl) {
  try {
    var cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      var parsed = JSON.parse(cached);
      if (
        parsed &&
        parsed.value &&
        Date.now() - parsed.fetchedAt < CACHE_TTL_MS
      ) {
        return parsed.value;
      }
    }
  } catch (e) {
    /* sessionStorage unavailable or corrupt — continue to network */
  }

  var timer;
  try {
    var controller = new AbortController();
    timer = setTimeout(function () {
      controller.abort();
    }, FETCH_TIMEOUT_MS);

    var res = await fetch(baseUrl + "/rum/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey }),
      signal: controller.signal,
    });

    if (!res.ok) return fallback;

    var config = await res.json();
    if (!config || typeof config !== "object") return fallback;

    try {
      sessionStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ value: config, fetchedAt: Date.now() }),
      );
    } catch (e) {
      /* quota / private mode — ignore */
    }
    return config;
  } catch (e) {
    return fallback; // config service down or timed out — don't break capture
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Merge conservative defaults ← remote config ← explicit data-attribute
 * overrides. Attribute overrides only apply when the attribute is present.
 */
export function resolveConfig(defaults, remote, attributeOverrides) {
  return Object.assign(
    {},
    defaults || {},
    remote || {},
    attributeOverrides || {},
  );
}
