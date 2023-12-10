import React, { useEffect, useState } from "react";

import { addMinutes, differenceInSeconds, isAfter } from "date-fns";

type TimerProps =
  | {
      endTime: Date;
    }
  | {
      startTime: Date;
      duration: number;
    };

export default function Timer(props: TimerProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  const endTime = "endTime" in props ? props.endTime : addMinutes(props.startTime, props.duration);

  useEffect(() => {
    if (!endTime) return;
    const id = setInterval(() => {
      const now = new Date();
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
