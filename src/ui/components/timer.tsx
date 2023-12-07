import React, { useEffect, useMemo, useState } from "react";

import { add, differenceInSeconds, isAfter } from "date-fns";

type TimerProps = {
  startTime?: Date;
  duration?: Duration;
};

export default function Timer({ startTime, duration }: TimerProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  const endTime = useMemo(
    () => startTime && duration && add(startTime, duration),
    [startTime, duration],
  );

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

  if (!startTime || !duration) {
    return <div className="font-mono">--:--</div>;
  }

  const timeLeft = Math.max(differenceInSeconds(endTime!, currentTime), 0);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="countdown font-mono">
      <span style={{ "--value": minutes } as any} />:
      <span style={{ "--value": seconds } as any} />
    </div>
  );
}
