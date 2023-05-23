import React, { useEffect, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import ProgressBlock from "~/src/ui/components/progressBlock";

dayjs.extend(relativeTime);

type TimerProps = {
  startTime: Dayjs;
  endTime: Dayjs;
};
export default function Timer({ startTime, endTime }: TimerProps) {
  const [currentTime, setCurrentTime] = useState(dayjs());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(dayjs()), 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  const duration = endTime.diff(startTime, "s");
  const timeLeft = endTime.diff(currentTime, "s");
  const timeElapsed = currentTime.diff(startTime, "s");

  return (
    <ProgressBlock percentage={(timeElapsed / duration) * 100} className="w-20">
      <span>{Math.floor(timeLeft / 60)}</span>
      <span>:</span>
      <span>{(timeLeft % 60).toString().padStart(2, "0")}</span>
    </ProgressBlock>
  );
}
