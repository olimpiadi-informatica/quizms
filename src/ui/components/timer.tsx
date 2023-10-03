import React, { useEffect, useState } from "react";

import { differenceInSeconds, isAfter } from "date-fns";

import Progress from "./progress";

type TimerProps = {
  startTime?: Date;
  endTime?: Date;
};

export default function Timer({ startTime, endTime }: TimerProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (!endTime) return;
    const id = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      if (isAfter(now, endTime)) {
        clearInterval(id);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [endTime]);

  if (!startTime || !endTime) {
    return (
      <Progress className="w-20">
        <div className="font-mono">--:--</div>
      </Progress>
    );
  }

  const duration = differenceInSeconds(endTime, startTime);
  const timeLeft = Math.max(differenceInSeconds(endTime, currentTime), 0);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <Progress percentage={(1 - timeLeft / duration) * 100} className="w-20">
      <div className="countdown font-mono">
        <span style={{ "--value": minutes } as any} />:
        <span style={{ "--value": seconds } as any} />
      </div>
    </Progress>
  );
}
