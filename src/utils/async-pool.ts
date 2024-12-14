import { size } from "lodash-es";

export class AsyncPool {
  private promises: Promise<any>[] = [];
  private running: Record<number, Promise<void>> = {};
  private pending: Array<() => Promise<void>> = [];
  private nextId = 0;

  constructor(private concurrency: number) {}

  private runNext() {
    if (size(this.running) >= this.concurrency) return;

    const task = this.pending.shift();
    if (!task) return;

    const taskId = this.nextId++;
    this.running[taskId] = task().finally(() => {
      delete this.running[taskId];
      this.runNext();
    });
  }

  public run<Ret, Args extends any[]>(task: (...args: Args) => Promise<Ret>, ...args: Args) {
    const promise = new Promise<Ret>((resolve, reject) => {
      this.pending.push(() =>
        task(...args)
          .then(resolve)
          .catch(reject),
      );
    });
    this.promises.push(promise);
    this.runNext();
    return promise;
  }

  public async wait() {
    await Promise.all(this.promises);
  }
}
