import { useEffect, useState } from "react";

type Subscription<T> = {
  promise: Promise<T>;
  unsubscribe: () => void;
  listeners: ((value: T) => void)[];
  data?: { value: T };
};

const subscriptions = new Map<string, Subscription<any>>();
const pendingUnsubscribes = new Map<string, number>();

export default function useSubscription<T>(
  key: string,
  subscribe: (set: (value: T) => void) => () => void,
): T {
  let subscription = subscriptions.get(key);
  if (!subscription) {
    let resolve!: () => void;
    const promise = new Promise<void>((r) => (resolve = r));

    const unsubscribe = subscribe((value) => {
      resolve();
      const sub = subscriptions.get(key);
      if (sub) {
        sub.data = { value };
        for (const listener of sub.listeners) {
          listener(value);
        }
      }
    });
    subscription = { promise, unsubscribe, listeners: [] };
    subscriptions.set(key, subscription);
  }

  if (!subscription.data) throw subscription.promise;

  const [data, setData] = useState(subscription.data.value);
  useEffect(() => {
    subscription!.listeners.push(setData);

    clearTimeout(pendingUnsubscribes.get(key));
    pendingUnsubscribes.delete(key);

    return () => {
      subscription!.listeners = subscription!.listeners.filter((listener) => listener !== setData);
      if (subscription!.listeners.length) return;

      const id = setTimeout(() => {
        subscription?.unsubscribe();
        subscriptions.delete(key);
      }, 100);
      pendingUnsubscribes.set(key, id as any);
    };
  }, [key, subscription]);

  return data;
}
