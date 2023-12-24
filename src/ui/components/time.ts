import { useEffect, useReducer } from "react";

import { addMilliseconds, differenceInMilliseconds } from "date-fns";
import useSWR from "swr/immutable";

export function useTime() {
  const { data } = useSWR("time-server", fetcher, { suspense: true });

  return () => addMilliseconds(new Date(), data);

  async function fetcher() {
    if (!import.meta.env.QUIZMS_TIME_SERVER) return 0;

    try {
      const resp = await fetch(import.meta.env.QUIZMS_TIME_SERVER);
      if (!resp.ok) return 0;

      const localTime = Date.now();

      const text = await resp.text();
      const serverTime = Number(text);
      if (isNaN(serverTime)) return 0;

      return serverTime - localTime;
    } catch (e) {
      return 0;
    }
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
