import { useEffect, useState } from "react";

type Subscription<T> = {
  promise: Promise<void>;
  unsubscribe?: () => void;
  listeners: Set<(data: T) => void>;
  data?: { value: T };
};

const subscriptions = new Map<string, Subscription<any>>();
const pendingUnsubscribes = new Map<string, number>();

export function useSubscription<T>(
  key: string,
  subscribe: (set: (value: T) => void) => (() => void) | undefined,
) {
  const subscription = useBaseSubscription(key, subscribe);
  if (!subscription.data) throw subscription.promise;

  const [value, setValue] = useState(subscription.data.value);
  useEffect(() => {
    subscription.listeners.add(setValue);
    return () => void subscription.listeners.delete(setValue);
  }, [subscription]);

  return value;
}

export function useSubscriptionListener<T>(
  key: string,
  subscribe: (set: (value: T) => void) => (() => void) | undefined,
  onData: (value: T) => void,
) {
  const subscription = useBaseSubscription(key, subscribe);

  useEffect(() => {
    subscription.listeners.add(onData);
    return () => void subscription.listeners.delete(onData);
  }, [subscription, onData]);
}

function useBaseSubscription<T>(
  key: string,
  subscribe: (set: (value: T) => void) => (() => void) | undefined,
): Subscription<T> {
  let subscription = subscriptions.get(key) as Subscription<T>;
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
    subscription = { promise, unsubscribe, listeners: new Set() };
    subscriptions.set(key, subscription);
  }

  useEffect(() => {
    clearTimeout(pendingUnsubscribes.get(key));
    pendingUnsubscribes.delete(key);

    return () => {
      clearTimeout(pendingUnsubscribes.get(key));
      pendingUnsubscribes.delete(key);

      const id = setTimeout(() => {
        if (subscription?.listeners.size) return;
        subscription?.unsubscribe?.();
        subscriptions.delete(key);
      }, 100);
      pendingUnsubscribes.set(key, id as any);
    };
  }, [key, subscription]);

  return subscription;
}
