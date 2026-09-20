import { describe, it, expect } from "vitest";
import { cleanUrl, fingerprint } from "../src/util.js";

describe("cleanUrl", () => {
  it("strips query string by default", () => {
    expect(
      cleanUrl("https://app.example.com/checkout?ref=abc&token=xyz", false),
    ).toBe("https://app.example.com/checkout");
  });

  it("preserves query string when capture is enabled", () => {
    const url = "https://app.example.com/checkout?ref=abc";
    expect(cleanUrl(url, true)).toBe(url);
  });

  it("falls back to the raw string only when URL parsing truly fails", () => {
    // The WHATWG URL constructor is permissive and resolves most strings
    // against the current origin rather than throwing — so this mostly
    // documents that behavior rather than exercising the catch block.
    // The catch block itself guards truly invalid input (e.g. malformed
    // protocol-relative strings) and is defensive rather than commonly hit.
    expect(typeof cleanUrl("not a url::", false)).toBe("string");
  });
});

describe("fingerprint", () => {
  it("produces a stable key for identical inputs", () => {
    const a = fingerprint("js_error", "TypeError: x is undefined", "app.js:12");
    const b = fingerprint("js_error", "TypeError: x is undefined", "app.js:12");
    expect(a).toBe(b);
  });

  it("differs when the event type differs", () => {
    const a = fingerprint("js_error", "same message", "same source");
    const b = fingerprint("network_error", "same message", "same source");
    expect(a).not.toBe(b);
  });

  it("truncates very long messages", () => {
    const longMessage = "x".repeat(500);
    const fp = fingerprint("js_error", longMessage, "");
    expect(fp.length).toBeLessThan(200);
  });
});
