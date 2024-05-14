import { useEffect, useState } from "react";

import { addMinutes, differenceInSeconds, isAfter } from "date-fns";

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
  const [currentTime, setCurrentTime] = useState(Date.now());

  const endTime = props.endTime ?? addMinutes(props.startTime, props.duration);

  useEffect(() => {
    if (!endTime) return;
    const id = setInterval(() => {
      const now = Date.now();
      setCurrentTime(now);
      if (isAfter(now, endTime)) {
        clearInterval(id);
      }
    }, 100);
    return () => clearInterval(id);
  }, [endTime]);

  if (!endTime) {
    return <span className="font-mono">--:--</span>;
  }

  let timeLeft = Math.max(differenceInSeconds(endTime!, currentTime), 0);

  if (props.duration) {
    timeLeft = Math.min(timeLeft, props.duration * 60);
  }

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor(timeLeft / 60) % 60;
  const seconds = timeLeft % 60;

  return hours > 0 ? (
    <span className="countdown font-mono">
      <span style={{ "--value": hours } as any} />h
      <span style={{ "--value": minutes } as any} />m
    </span>
  ) : (
    <span className="countdown font-mono">
      <span style={{ "--value": minutes } as any} />m
      <span style={{ "--value": seconds } as any} />s
    </span>
  );
}
