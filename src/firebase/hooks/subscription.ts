import { useEffect } from "react";

type Subscription<T> = {
  promise: Promise<T>;
  unsubscribe: () => void;
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
      if (sub) sub.data = { value };
    });
    subscription = { promise, unsubscribe };
    subscriptions.set(key, subscription);
  }

  useEffect(() => {
    const id = pendingUnsubscribes.get(key);
    clearTimeout(id);
    pendingUnsubscribes.delete(key);
    return () => {
      const id = setTimeout(() => {
        subscription?.unsubscribe();
        subscriptions.delete(key);
      }, 100);
      pendingUnsubscribes.set(key, id as any);
    };
  }, [key, subscription]);

  if (!subscription.data) throw subscription.promise;
  return subscription.data.value;
}
