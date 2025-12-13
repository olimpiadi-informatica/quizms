import { cpus } from "node:os";

import { SingleBar } from "cli-progress";
import { formatDistanceStrict } from "date-fns";

import { AsyncPool } from "~/utils";

export async function withProgress<T>(
  values: AsyncIterable<T> | Iterable<T>,
  total: number,
  consumer: (value: T) => Promise<any>,
) {
  const bar = new SingleBar({
    format: "  {bar} {percentage}% | ETA: {eta_formatted} | {value}/{total}",
    barCompleteChar: "\u2588",
    barIncompleteChar: "\u2582",
    etaBuffer: 10000,
    formatTime: (t) => formatDistanceStrict(0, t * 1000),
  });

  bar.start(total, 0);
  const pool = new AsyncPool(cpus().length);

  for await (const value of values) {
    void pool.run(async () => {
      await consumer(value);
      bar.increment();
    });
  }

  await pool.wait();
  bar.stop();
}
