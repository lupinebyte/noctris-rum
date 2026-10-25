# Changelog

## v1.1.2

- Flush events with `fetch(keepalive)` only — drop `sendBeacon` on tab-hide.
  Avoids CORS failures when the API returns `Access-Control-Allow-Origin: *`
  (`sendBeacon` always uses credentials mode `include`). Requests now use
  `credentials: "omit"`.

## v1.1.1

- `BASE_URL` / `data-noctris-base-url` is now the API host only
  (`https://api.noctris.io`). The `/v1` API major version is hardcoded in
  paths: `{baseUrl}/v1/rum/config` and `{baseUrl}/v1/rum/events`.

## v1.1.0

- Fetch org RUM config from remote `{baseUrl}/rum/config` (POST with API key),
  cached in sessionStorage for 5 minutes. On timeout or failure, falls back to
  conservative local defaults so capture still starts.
- Config merge order: conservative defaults ← remote config ← data-attribute
  overrides (`data-noctris-capture-query`, `data-noctris-sample-rate`).
- `data-noctris-base-url` overrides the shared API host for both config and
  events.

## v1.0.0

- Initial release: JS error capture, unhandled promise rejection capture,
  fetch/XHR network error + timing capture (sampled), page load timing
  via Navigation Timing API.
- Batching with 5s flush interval, sendBeacon on tab-hide, fetch(keepalive)
  fallback.
- Per-session, per-fingerprint rate limiting (max 5 identical events)
  to protect against error storms.
- Query strings stripped from captured URLs by default.
