import { useEffect, useReducer } from "react";

import { addMilliseconds, differenceInMilliseconds } from "date-fns";
import useSWR from "swr/immutable";

export function useTime() {
  const { data } = useSWR("https://time1.olinfo.it/", fetcher, { suspense: true });

  return () => addMilliseconds(new Date(), data);

  async function fetcher(url: string) {
    const resp = await fetch(url);
    const localTime = Date.now();

    if (!resp.ok) throw new Error("Failed to fetch time");

    const text = await resp.text();
    const serverTime = Number(text);

    return serverTime - localTime;
  }
}

export function useUpdateAt(time?: Date, callback?: () => void) {
  const now = useTime();

  const [, refresh] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    if (!time) return;

    const diff = differenceInMilliseconds(time, now());
    if (diff < 0) return;

    const timeout = setTimeout(() => {
      refresh();
      callback?.();
    }, diff + 5);
    return () => clearTimeout(timeout);
  }, [time, refresh, callback, now]);
}
