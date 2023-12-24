import React, { useEffect, useState } from "react";

import { addMinutes, differenceInSeconds } from "date-fns";

import { useTime } from "./time";

type TimerProps =
  | {
      endTime: Date;
    }
  | {
      startTime: Date;
      duration: number;
    };

export default function Timer(props: TimerProps) {
  const getNow = useTime();
  const [currentTime, setCurrentTime] = useState(getNow());

  const endTime = "endTime" in props ? props.endTime : addMinutes(props.startTime, props.duration);

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

  if ("startTime" in props) {
    timeLeft = Math.min(timeLeft, props.duration * 60);
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <span className="countdown font-mono">
      <span style={{ "--value": minutes } as any} />:
      <span style={{ "--value": seconds } as any} />
    </span>
  );
}
