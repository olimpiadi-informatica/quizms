import React, { useEffect, useState } from "react";

import dayjs, { Dayjs } from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import ProgressBlock from "@/ui/components/progressBlock";

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

  return (
    <ProgressBlock percentage={(timeElapsed / (duration - 1)) * 100} className="w-20">
      <span>{Math.floor(timeLeft / 60)}</span>
      <span>:</span>
      <span>{(timeLeft % 60).toString().padStart(2, "0")}</span>
    </ProgressBlock>
  );
}
