import React, { useCallback, useEffect, useState } from "react";

import {
  addMilliseconds,
  addMinutes,
  differenceInMilliseconds,
  differenceInSeconds,
} from "date-fns";
import useSWR from "swr/immutable";

export function useTime() {
  const { data } = useSWR("time-server", fetcher, { suspense: true });

  return () => addMilliseconds(new Date(), data);
}

async function fetcher() {
  if (!import.meta.env.QUIZMS_TIME_SERVER) return 0;

  try {
    const resp = await fetch(import.meta.env.QUIZMS_TIME_SERVER);
    if (!resp.ok) return 0;

    const localTime = Date.now();

    const text = await resp.text();
    const serverTime = Number(text);
    if (Number.isNaN(serverTime)) return 0;

    return serverTime - localTime;
  } catch {
    return 0;
  }
}

export function useIsAfter(time?: Date) {
  const now = useTime();
  const isAfter = useCallback(() => !!time && now() >= time, [time, now]);

  const [value, setValue] = useState(isAfter);
  const refresh = useCallback(() => !value && isAfter() && setValue(true), [value, isAfter]);

  useEffect(() => {
    if (!time) {
      setValue(false);
      return;
    }

    const diff = differenceInMilliseconds(time, now());
    if (diff < 0) return;

    const timeout = setTimeout(refresh, diff + 5);
    return () => clearTimeout(timeout);
  }, [time, refresh, now]);

  useEffect(() => {
    window.addEventListener("visibilitychange", refresh);
    return () => window.removeEventListener("visibilitychange", refresh);
  }, [refresh]);

  return value;
}

type TimerProps =
  | {
      startTime?: undefined;
      duration?: undefined;
      endTime: Date;
    }
  | {
      startTime: Date;
      duration: number;
      endTime?: undefined;
    };

export function Timer(props: TimerProps) {
  const getNow = useTime();
  const [currentTime, setCurrentTime] = useState(getNow());

  const endTime = props.endTime ?? addMinutes(props.startTime, props.duration);

  useEffect(() => {
    if (!endTime) return;
    const id = setInterval(() => {
      const now = getNow();
      setCurrentTime(now);
      if (now >= endTime) {
        clearInterval(id);
      }
    }, 100);
    return () => clearInterval(id);
  }, [endTime, getNow]);

  if (!endTime) {
    return <span className="font-mono">--:--</span>;
  }

  let timeLeft = Math.max(differenceInSeconds(endTime!, currentTime), 0);

  if (props.duration) {
    timeLeft = Math.min(timeLeft, props.duration * 60);
  }

  const minutes = Math.floor(timeLeft / 60) % 100;
  const seconds = timeLeft % 60;

  return (
    <span className="countdown font-mono">
      <span style={{ "--value": minutes } as any} />:
      <span style={{ "--value": seconds } as any} />
    </span>
  );
}
