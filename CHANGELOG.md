# Changelog

## v1.0.0

- Initial release: JS error capture, unhandled promise rejection capture,
  fetch/XHR network error + timing capture (sampled), page load timing
  via Navigation Timing API.
- Batching with 5s flush interval, sendBeacon on tab-hide, fetch(keepalive)
  fallback.
- Per-session, per-fingerprint rate limiting (max 5 identical events)
  to protect against error storms.
- Query strings stripped from captured URLs by default.
