import type { Answer } from "@olinfo/quizms/models";
import { TRPCClientError } from "@trpc/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AnswerQueue, isRetryableError } from "./answer-queue";

const a = (value: number): Answer => ({ type: "openNumber", value });

class Deferred {
  promise: Promise<void>;
  resolve!: () => void;
  reject!: (err: unknown) => void;
  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}

/** A `send` whose calls are recorded and settled manually by the test. */
function manualSend() {
  const calls: { problemId: string; answer: Answer; result: Deferred }[] = [];
  const send = vi.fn((problemId: string, answer: Answer) => {
    const result = new Deferred();
    calls.push({ problemId, answer, result });
    return result.promise;
  });
  return { send, calls };
}

const permanent = new Error("Gara già terminata");
const isRetryable = (err: unknown) => err !== permanent;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("AnswerQueue", () => {
  it("sends one request at a time, in order", async () => {
    const { send, calls } = manualSend();
    const queue = new AnswerQueue(send, { isRetryable });

    queue.set("1", a(1));
    queue.set("2", a(2));
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ problemId: "1", answer: a(1) });

    calls[0].result.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toHaveLength(2);
    expect(calls[1]).toMatchObject({ problemId: "2", answer: a(2) });

    calls[1].result.resolve();
    await queue.flush(1000);
    expect(queue.status.saving).toBe(false);
  });

  it("sends only the latest answer to a problem changed while a request is in flight", async () => {
    const { send, calls } = manualSend();
    const queue = new AnswerQueue(send, { isRetryable });

    queue.set("1", a(1));
    queue.set("2", a(20));
    queue.set("2", a(21));
    queue.set("2", a(22));

    calls[0].result.resolve();
    await vi.advanceTimersByTimeAsync(0);
    calls[1].result.resolve();
    await queue.flush(1000);

    expect(calls.map((c) => [c.problemId, c.answer])).toEqual([
      ["1", a(1)],
      ["2", a(22)],
    ]);
  });

  it("shows pending answers on top of the server ones until the server catches up", async () => {
    const { send, calls } = manualSend();
    const queue = new AnswerQueue(send, { isRetryable });

    queue.set("1", a(1));
    expect(queue.merge({ "2": a(2) })).toEqual({ "1": a(1), "2": a(2) });

    // Saved, but the snapshot with the new value has not arrived yet.
    calls[0].result.resolve();
    await queue.flush(1000);
    expect(queue.merge({ "1": a(0) })).toEqual({ "1": a(1) });

    // The snapshot arrives: from now on the server value is used.
    expect(queue.merge({ "1": a(1) })).toEqual({ "1": a(1) });
    expect(queue.merge({ "1": a(5) })).toEqual({ "1": a(5) });
  });

  it("treats a missing value and an undefined value as the same answer", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const queue = new AnswerQueue(send, { isRetryable });

    queue.set("2", { type: "multipleChoice", value: undefined });
    await queue.flush(1000);
    queue.merge({ "2": { type: "multipleChoice" } });
    expect(queue.merge({})).toEqual({});
  });

  it("retries transient failures with backoff and reports them", async () => {
    const send = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(undefined);
    const queue = new AnswerQueue(send, { isRetryable, baseDelay: 100, failingAfter: 2 });

    queue.set("1", a(1));
    await vi.advanceTimersByTimeAsync(0);
    expect(send).toHaveBeenCalledTimes(1);
    expect(queue.status).toMatchObject({ saving: true, failing: false });

    await vi.advanceTimersByTimeAsync(100);
    expect(send).toHaveBeenCalledTimes(2);
    expect(queue.status).toMatchObject({ saving: true, failing: true });

    await vi.advanceTimersByTimeAsync(199);
    expect(send).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(send).toHaveBeenCalledTimes(3);

    await queue.flush(1000);
    expect(queue.status).toEqual({ saving: false, failing: false, error: undefined });
    expect(queue.merge({})).toEqual({ "1": a(1) });
  });

  it("retries the newest answer if it changed while offline", async () => {
    const { send, calls } = manualSend();
    const queue = new AnswerQueue(send, { isRetryable, baseDelay: 100 });

    queue.set("1", a(1));
    queue.set("1", a(2));
    calls[0].result.reject(new TypeError("Failed to fetch"));
    await vi.advanceTimersByTimeAsync(100);

    expect(calls).toHaveLength(2);
    expect(calls[1].answer).toEqual(a(2));
  });

  it("discards answers rejected by the server and reports the error", async () => {
    const send = vi.fn().mockRejectedValue(permanent);
    const queue = new AnswerQueue(send, { isRetryable });

    queue.set("1", a(1));
    await queue.flush(1000);

    expect(send).toHaveBeenCalledTimes(1);
    expect(queue.status.error).toBe("Gara già terminata");
    expect(queue.merge({ "1": a(0) })).toEqual({ "1": a(0) });

    // A new answer clears the error.
    send.mockResolvedValue(undefined);
    queue.set("1", a(3));
    expect(queue.status.error).toBeUndefined();
  });

  it("flush fails after the timeout while the answers cannot be saved", async () => {
    const send = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const queue = new AnswerQueue(send, { isRetryable, baseDelay: 100 });

    queue.set("1", a(1));
    const flushed = queue.flush(1000);
    const assertion = expect(flushed).rejects.toThrow("Impossibile salvare le risposte");
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
    expect(queue.status.saving).toBe(true);
  });

  it("flush resolves immediately when there is nothing to send", async () => {
    const queue = new AnswerQueue(vi.fn(), { isRetryable });
    await expect(queue.flush(0)).resolves.toBeUndefined();
  });

  it("notifies subscribers on every change", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const queue = new AnswerQueue(send, { isRetryable });
    const listener = vi.fn();
    queue.subscribe(listener);

    const before = queue.getVersion();
    queue.set("1", a(1));
    await queue.flush(1000);
    expect(listener).toHaveBeenCalled();
    expect(queue.getVersion()).toBeGreaterThan(before);
  });
});

describe("isRetryableError", () => {
  function trpcError(code?: string) {
    return new TRPCClientError("error", {
      result: code ? ({ error: { data: { code } } } as any) : undefined,
    });
  }

  it("retries network failures and server errors", () => {
    expect(isRetryableError(new TypeError("Failed to fetch"))).toBe(true);
    expect(isRetryableError(trpcError())).toBe(true);
    expect(isRetryableError(trpcError("INTERNAL_SERVER_ERROR"))).toBe(true);
    expect(isRetryableError(trpcError("TOO_MANY_REQUESTS"))).toBe(true);
  });

  it("does not retry requests rejected by the server", () => {
    expect(isRetryableError(trpcError("FORBIDDEN"))).toBe(false);
    expect(isRetryableError(trpcError("BAD_REQUEST"))).toBe(false);
    expect(isRetryableError(trpcError("UNAUTHORIZED"))).toBe(false);
  });
});
