import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  CONSERVATIVE_DEFAULTS,
  conservativeDefaults,
  fetchRemoteConfig,
  resolveConfig,
} from "../src/config.js";

var BASE_URL = "https://api.noctris.io/v1";

describe("conservativeDefaults", () => {
  it("builds the events endpoint from the base URL", () => {
    expect(conservativeDefaults(BASE_URL).endpoint).toBe(
      BASE_URL + "/rum/events",
    );
  });

  it("includes shared conservative defaults", () => {
    var defaults = conservativeDefaults(BASE_URL);
    expect(defaults.sample_rate).toBe(CONSERVATIVE_DEFAULTS.sample_rate);
    expect(defaults.capture_query).toBe(false);
  });
});

describe("resolveConfig", () => {
  it("starts from the provided defaults", () => {
    var defaults = conservativeDefaults(BASE_URL);
    expect(resolveConfig(defaults, {}, {})).toEqual(defaults);
  });

  it("overlays remote values on defaults", () => {
    var defaults = conservativeDefaults(BASE_URL);
    var resolved = resolveConfig(
      defaults,
      { sample_rate: 0.5, capture_query: true },
      {},
    );
    expect(resolved.sample_rate).toBe(0.5);
    expect(resolved.capture_query).toBe(true);
    expect(resolved.flush_interval_ms).toBe(defaults.flush_interval_ms);
  });

  it("lets attribute overrides win over remote", () => {
    var defaults = conservativeDefaults(BASE_URL);
    var resolved = resolveConfig(
      defaults,
      { sample_rate: 0.5 },
      { sample_rate: 1 },
    );
    expect(resolved.sample_rate).toBe(1);
    expect(resolved.endpoint).toBe(defaults.endpoint);
  });

  it("builds events endpoint from an overridden base URL", () => {
    var local = conservativeDefaults("http://localhost:4000");
    expect(local.endpoint).toBe("http://localhost:4000/rum/events");
  });
});

describe("fetchRemoteConfig", () => {
  var fallback = conservativeDefaults(BASE_URL);

  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("returns fallback when fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(function () {
        return Promise.reject(new Error("network down"));
      }),
    );
    var result = await fetchRemoteConfig("test_key", fallback, BASE_URL);
    expect(result).toEqual(fallback);
  });

  it("returns fallback on non-OK response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(function () {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: function () {},
        });
      }),
    );
    var result = await fetchRemoteConfig("test_key", fallback, BASE_URL);
    expect(result).toEqual(fallback);
  });

  it("returns and caches remote config on success", async () => {
    var remote = { sample_rate: 0.25, capture_query: false };
    vi.stubGlobal(
      "fetch",
      vi.fn(function () {
        return Promise.resolve({
          ok: true,
          json: function () {
            return Promise.resolve(remote);
          },
        });
      }),
    );

    var first = await fetchRemoteConfig("test_key", fallback, BASE_URL);
    expect(first).toEqual(remote);

    // Second call should hit sessionStorage, not fetch again
    var fetchMock = fetch;
    fetchMock.mockClear();
    var second = await fetchRemoteConfig("test_key", fallback, BASE_URL);
    expect(second).toEqual(remote);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("POSTs the api key in the body, not the URL", async () => {
    var fetchMock = vi.fn(function () {
      return Promise.resolve({
        ok: true,
        json: function () {
          return Promise.resolve({ sample_rate: 1 });
        },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchRemoteConfig("key with spaces", fallback, BASE_URL);

    expect(fetchMock.mock.calls[0][0]).toBe(BASE_URL + "/rum/config");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: "key with spaces" }),
    });
  });
});
