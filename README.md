# noctris-rum

Client-side Real User Monitoring snippet for [Noctris](https://noctris.io). Captures unhandled
JS errors, unhandled promise rejections, failed/slow network requests, and page load timing
directly from real users' browsers, and ships them to your Noctris dashboard.

Distributed as a hosted CDN script — no build step, no npm install required for end users.

## Install

```html
<script
  src="https://cdn.noctris.io/rum/v1/noctris-rum.js"
  data-noctris-key="YOUR_API_KEY"
  async
></script>
```

Place it in `<head>` or right before `</body>` — either works; capture is wired up as soon as
the script executes.

### Config options (data attributes)

| Attribute                        | Default                                  | Description                                                              |
| --------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------- |
| `data-noctris-key`                 | *(required)*                              | Your org's API key.                                                        |
| `data-noctris-base-url`            | `https://api.noctris.io`                  | Override API host for config + events (paths `/v1/rum/config`, `/v1/rum/events`). |
| `data-noctris-capture-query`       | `false`                                   | Set `"true"` to preserve query strings in captured URLs (off by default for privacy). |
| `data-noctris-sample-rate`         | `1`                                       | 0.0–1.0. Sampling applied to successful network timing events only — errors are always captured. |

## What's NOT captured

No cookies, no form input, no PII by default, no session replay, no source-map deobfuscation.
See `src/` — the entire capture surface is a few hundred lines and worth reading if you want to
know exactly what ships off the page.

## Local development

```bash
npm install
npm run build       # bundles src/ → dist/v1/noctris-rum.js (+ .min.js)
npm test            # vitest + jsdom
```

Open `examples/index.html` against your local `dist/v1/noctris-rum.js` build to manually trigger
errors and failed requests and eyeball the outgoing payloads in devtools.

## Repo layout

```
src/
  index.js          entry point — reads config, wires modules together
  queue.js          batching, rate limiting, flush/transport
  session.js        session ID generation/storage
  util.js           shared helpers (URL cleaning, fingerprinting)
  capture/
    errors.js       window.onerror + unhandledrejection
    network.js       fetch + XHR patching
    timing.js         Navigation Timing API
scripts/build.js    esbuild bundling → dist/v1/
examples/           manual browser test harness
test/               vitest unit tests
```

## Versioning & releases

CDN paths are keyed by **major version only**: `cdn.noctris.io/rum/v1/noctris-rum.js`.

- Bug fixes and additive, non-breaking changes → tag `v1.x.x`, CI pushes to the same `rum/v1/`
  path. Every embedded customer picks it up automatically, no action needed on their end.
- Breaking changes (payload shape, removed field, behavior change existing integrations rely on)
  → cut a new `rum/v2/` path instead of overwriting `v1`, so existing embeds don't silently break.

Releases are automated via `.github/workflows/release.yml`: pushing a `v1.*` tag runs tests,
builds, and uploads to DigitalOcean Spaces, then purges the CDN cache.

## License

Currently unpublished/private. Consider open-sourcing this repo specifically (not the rest of
the Noctris codebase) — since it runs on customer sites and touches their users' data, "read
exactly what we collect" is a real trust signal for a privacy-conscious audience.
