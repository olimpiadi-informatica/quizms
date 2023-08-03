import React, { useEffect, useState } from "react";

import dayjs, { Dayjs } from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime.js";

import Progress from "./progress";

dayjs.extend(relativeTime);

type TimerProps = {
  startTime: Dayjs;
  endTime: Dayjs;
};

export default function Timer({ startTime, endTime }: TimerProps) {
  const [currentTime, setCurrentTime] = useState(dayjs());

  useEffect(() => {
    const id = setInterval(() => {
      const now = dayjs();
      setCurrentTime(now);
      if (now.isAfter(endTime)) {
        clearInterval(id);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [endTime]);

  const duration = endTime.diff(startTime, "seconds");
  const timeLeft = Math.max(endTime.diff(currentTime, "seconds"), 0);
  const timeElapsed = Math.min(currentTime.diff(startTime, "seconds"), duration);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <Progress percentage={(timeElapsed / (duration - 1)) * 100} className="w-20">
      <div className="countdown font-mono">
        <span style={{ "--value": minutes } as any} />:
        <span style={{ "--value": seconds } as any} />
      </div>
    </Progress>
  );
}
