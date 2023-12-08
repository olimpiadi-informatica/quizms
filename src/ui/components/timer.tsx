import React, { useEffect, useState } from "react";

import { differenceInSeconds, isAfter } from "date-fns";

type TimerProps = {
  endTime?: Date;
};

export default function Timer({ endTime }: TimerProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

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
    return <div className="font-mono">--:--</div>;
  }

  const timeLeft = Math.max(differenceInSeconds(endTime!, currentTime), 0);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="grid grid-flow-col gap-5 text-center auto-cols-max">
      <div className="flex flex-col p-2 bg-neutral rounded-box text-neutral-content">
        <span className="countdown font-mono text-5xl">
          <span style={{ "--value": minutes } as any} />
        </span>
        min
      </div> 
      <div className="flex flex-col p-2 bg-neutral rounded-box text-neutral-content">
        <span className="countdown font-mono text-5xl">
          <span style={{ "--value": seconds } as any} /> 
        </span>
        sec
      </div>
    </div>
  );
}
