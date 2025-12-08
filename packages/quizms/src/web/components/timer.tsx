import { useEffect, useState } from "react";

import clsx from "clsx";
import { differenceInSeconds, isAfter } from "date-fns";

type TimerProps = {
  endTime: Date;
  noAnimation?: boolean;
  hideMinutes?: boolean;
};

export function Timer({ endTime, noAnimation, hideMinutes }: TimerProps) {
  const [currentTime, setCurrentTime] = useState(Date.now());

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

  const timeLeft = Math.max(differenceInSeconds(endTime!, currentTime), 0);

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor(timeLeft / 60) % 60;
  const seconds = timeLeft % 60;

  return hours > 0 ? (
    <span className={clsx("countdown font-mono", noAnimation && "[&_*:before]:transition-none")}>
      <span style={{ "--value": hours } as any} />h
      <span style={{ "--value": minutes } as any} />m
    </span>
  ) : (
    <span className={clsx("countdown font-mono", noAnimation && "[&_*:before]:transition-none")}>
      {!hideMinutes && (
        <>
          <span style={{ "--value": minutes } as any} />m
        </>
      )}
      <span style={{ "--value": seconds } as any} />s
    </span>
  );
}
