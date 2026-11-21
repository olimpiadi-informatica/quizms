import type { Answer, Student } from "@olinfo/quizms/models";
import { TRPCClientError } from "@trpc/client";
import { isEqual, isUndefined, omitBy } from "lodash-es";

type Send = (problemId: string, answer: Answer) => Promise<void>;

type Options = {
  /** Delay before the first retry, doubled at every consecutive failure. */
  baseDelay?: number;
  /** Upper bound for the retry delay. */
  maxDelay?: number;
  /**
   * Milliseconds of consecutive transient failures after which `status.failing` becomes true, so
   * that short connection drops are retried silently.
   */
  failingAfter?: number;
  /** Whether a failed request should be retried. */
  isRetryable?: (err: unknown) => boolean;
};

export type AnswerQueueStatus = {
  /** Some answers have not been saved yet. */
  saving: boolean;
  /** Requests have been failing with transient errors for a while and are being retried. */
  failing: boolean;
  /** An answer was rejected by the server and has been discarded. */
  error?: string;
};

type Pending = { answer: Answer; sent: boolean };

const retryableCodes = new Set([
  "INTERNAL_SERVER_ERROR",
  "TIMEOUT",
  "TOO_MANY_REQUESTS",
  "BAD_GATEWAY",
  "SERVICE_UNAVAILABLE",
  "GATEWAY_TIMEOUT",
]);

/** Network failures and server-side errors are retried, rejected requests are not. */
export function isRetryableError(err: unknown): boolean {
  if (!(err instanceof TRPCClientError)) return true;
  const code = (err.data as { code?: string } | undefined)?.code;
  return code === undefined || retryableCodes.has(code);
}

function normalize(answer: Answer | undefined) {
  return answer && omitBy(answer, isUndefined);
}

/**
 * Saves the answers of a student through the API.
 *
 * - Requests are sent one at a time, so they reach the server in the order they were made.
 * - Answers to the same problem made while a request is in flight are merged: only the latest
 *   one is sent.
 * - Transient failures (e.g. no connection) are retried with exponential backoff, indefinitely.
 * - Answers are shown immediately (see `merge`) and kept until the server data catches up.
 */
export class AnswerQueue {
  /** Answers to show in place of the server ones. */
  private readonly pending = new Map<string, Pending>();
  /** Answers still to be sent, in insertion order. */
  private readonly unsent = new Map<string, Answer>();
  private running?: Promise<void>;
  private failures = 0;
  /** When the current streak of transient failures started. */
  private failingSince?: number;
  private failingTimer?: ReturnType<typeof setTimeout>;
  private error?: string;

  private version = 0;
  private readonly listeners = new Set<() => void>();

  private readonly baseDelay: number;
  private readonly maxDelay: number;
  private readonly failingAfter: number;
  private readonly isRetryable: (err: unknown) => boolean;

  constructor(
    private readonly send: Send,
    options: Options = {},
  ) {
    this.baseDelay = options.baseDelay ?? 500;
    this.maxDelay = options.maxDelay ?? 10_000;
    this.failingAfter = options.failingAfter ?? 15_000;
    this.isRetryable = options.isRetryable ?? isRetryableError;
  }

  set(problemId: string, answer: Answer) {
    this.pending.set(problemId, { answer, sent: false });
    this.unsent.delete(problemId);
    this.unsent.set(problemId, answer);
    this.error = undefined;
    this.notify();
    this.running ??= this.loop().finally(() => {
      this.running = undefined;
      this.notify();
    });
  }

  /**
   * Returns the server answers with the not yet confirmed ones applied on top. Answers that the
   * server data already reflects are forgotten.
   */
  merge(serverAnswers: Student["answers"] = {}): NonNullable<Student["answers"]> {
    const answers = { ...serverAnswers };
    for (const [problemId, { answer, sent }] of this.pending) {
      if (sent && isEqual(normalize(serverAnswers[problemId]), normalize(answer))) {
        this.pending.delete(problemId);
      } else {
        answers[problemId] = answer;
      }
    }
    return answers;
  }

  /** Waits until every answer has been sent, or throws after `timeout` milliseconds. */
  async flush(timeout: number) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const expired = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error("Impossibile salvare le risposte, controlla la connessione.")),
        timeout,
      );
    });
    try {
      while (this.running) {
        await Promise.race([this.running, expired]);
      }
    } finally {
      clearTimeout(timer);
    }
  }

  get status(): AnswerQueueStatus {
    return {
      saving: this.unsent.size > 0 || this.running !== undefined,
      failing:
        this.failingSince !== undefined && Date.now() - this.failingSince >= this.failingAfter,
      error: this.error,
    };
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  };

  getVersion = () => this.version;

  private notify() {
    this.version++;
    for (const listener of this.listeners) listener();
  }

  private startFailing() {
    if (this.failingSince !== undefined) return;
    this.failingSince = Date.now();
    // Re-render when the failure becomes visible, even if no retry happens at that moment.
    this.failingTimer = setTimeout(() => this.notify(), this.failingAfter);
  }

  private stopFailing() {
    this.failures = 0;
    this.failingSince = undefined;
    clearTimeout(this.failingTimer);
  }

  private async loop() {
    while (this.unsent.size > 0) {
      const [problemId, answer] = this.unsent.entries().next().value!;
      this.unsent.delete(problemId);

      try {
        await this.send(problemId, answer);
        this.stopFailing();
        const current = this.pending.get(problemId);
        if (current?.answer === answer) current.sent = true;
      } catch (err) {
        if (this.isRetryable(err)) {
          // Put it back unless a newer answer to the same problem is already waiting.
          if (!this.unsent.has(problemId)) this.unsent.set(problemId, answer);
          this.failures++;
          this.startFailing();
          this.notify();
          const delay = Math.min(this.baseDelay * 2 ** (this.failures - 1), this.maxDelay);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // Rejected by the server (e.g. contest ended): show the server value again.
        this.stopFailing();
        if (this.pending.get(problemId)?.answer === answer) this.pending.delete(problemId);
        this.error = err instanceof Error ? err.message : String(err);
      }
      this.notify();
    }
  }
}
