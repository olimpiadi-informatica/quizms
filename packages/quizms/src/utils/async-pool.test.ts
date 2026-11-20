import { describe, expect, it } from "vitest";

import { AsyncPool } from "~/utils/async-pool";

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("AsyncPool", () => {
  it("never runs more tasks than its concurrency", async () => {
    const pool = new AsyncPool(2);
    const tasks = Array.from({ length: 5 }, () => deferred());
    let running = 0;
    let maxRunning = 0;

    for (const task of tasks) {
      void pool.run(async () => {
        running++;
        maxRunning = Math.max(maxRunning, running);
        await task.promise;
        running--;
      });
    }

    await flush();
    expect(running).toBe(2);

    for (const task of tasks) {
      task.resolve();
      await flush();
    }
    await pool.wait();

    expect(maxRunning).toBe(2);
    expect(running).toBe(0);
  });

  it("starts tasks in order", async () => {
    const pool = new AsyncPool(1);
    const order: number[] = [];
    for (let i = 0; i < 4; i++) {
      void pool.run(async (n: number) => {
        order.push(n);
        await flush();
      }, i);
    }
    await pool.wait();
    expect(order).toEqual([0, 1, 2, 3]);
  });

  it("passes arguments and resolves with the task result", async () => {
    const pool = new AsyncPool(2);
    await expect(pool.run(async (a: number, b: number) => a + b, 2, 3)).resolves.toBe(5);
  });

  it("rejects the task promise and keeps running other tasks after a failure", async () => {
    const pool = new AsyncPool(1);
    const failing = pool.run(() => Promise.reject(new Error("boom")));
    const succeeding = pool.run(() => Promise.resolve("ok"));

    await expect(failing).rejects.toThrow("boom");
    await expect(succeeding).resolves.toBe("ok");
    await expect(pool.wait()).rejects.toThrow("boom");
  });

  it("waits for nothing when no task was scheduled", async () => {
    await expect(new AsyncPool(3).wait()).resolves.toBeUndefined();
  });
});
