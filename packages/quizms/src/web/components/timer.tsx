import { useEffect, useState } from "react";

import clsx from "clsx";
import { addMinutes, differenceInSeconds, isAfter } from "date-fns";

type TimerProps =
  | {
      startTime?: undefined;
      duration?: undefined;
      endTime: Date;
      noAnimation?: boolean;
      hideMinutes?: boolean;
    }
  | {
      startTime: Date;
      duration: number;
      endTime?: undefined;
      noAnimation?: boolean;
      hideMinutes?: boolean;
    };

export function Timer(props: TimerProps) {
  const [currentTime, setCurrentTime] = useState(Date.now());

  const endTime = props.endTime ?? addMinutes(props.startTime, props.duration);

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setCurrentTime(now);
      if (isAfter(now, endTime)) {
        clearInterval(id);
      }
    }, 100);
    return () => clearInterval(id);
  }, [endTime]);

  let timeLeft = Math.max(differenceInSeconds(endTime!, currentTime), 0);

  if (props.duration) {
    timeLeft = Math.min(timeLeft, props.duration * 60);
  }

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor(timeLeft / 60) % 60;
  const seconds = timeLeft % 60;

  return hours > 0 ? (
    <span
      className={clsx("countdown font-mono", props.noAnimation && "[&_*:before]:transition-none")}>
      <span style={{ "--value": hours } as any} />h
      <span style={{ "--value": minutes } as any} />m
    </span>
  ) : (
    <span
      className={clsx("countdown font-mono", props.noAnimation && "[&_*:before]:transition-none")}>
      {!props.hideMinutes && <span style={{ "--value": minutes } as any} />}
      <span style={{ "--value": seconds } as any} />s
    </span>
  );
}
