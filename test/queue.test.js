import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createQueue } from "../src/queue.js";

function makeQueue(overrides = {}) {
  return createQueue({
    endpoint: "https://ingest.noctris.io/rum/events",
    apiKey: "test_key",
    flushIntervalMs: 100000, // effectively disabled for these tests
    maxBatchSize: 20,
    maxEventsPerFingerprint: 5,
    ...overrides,
  });
}

describe("queue", () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("flushes when the batch size is reached", () => {
    const queue = makeQueue({ maxBatchSize: 3 });
    queue.enqueue({ event_type: "js_error", message: "a" });
    queue.enqueue({ event_type: "js_error", message: "b" });
    expect(fetchMock).not.toHaveBeenCalled();
    queue.enqueue({ event_type: "js_error", message: "c" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    queue._stop();
  });

  it("rate-limits repeated events sharing a fingerprint", () => {
    const queue = makeQueue({ maxBatchSize: 100, maxEventsPerFingerprint: 3 });
    for (let i = 0; i < 10; i++) {
      queue.enqueue({ event_type: "js_error", message: "spam", fingerprint: "same_fp" });
    }
    queue.flush(false);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.events.length).toBe(3);
    queue._stop();
  });

  it("does not rate-limit events without a fingerprint", () => {
    const queue = makeQueue({ maxBatchSize: 100 });
    for (let i = 0; i < 6; i++) {
      queue.enqueue({ event_type: "page_load", message: "load" });
    }
    queue.flush(false);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.events.length).toBe(6);
    queue._stop();
  });

  it("does nothing on flush when the queue is empty", () => {
    const queue = makeQueue();
    queue.flush(false);
    expect(fetchMock).not.toHaveBeenCalled();
    queue._stop();
  });
});
