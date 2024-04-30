import { ReactNode, Suspense, useMemo } from "react";

import { addMilliseconds } from "date-fns";

import { Loading, Timer, useIsAfter } from "~/components";
import { useStudent } from "~/web/student/provider";

export function BaseStatement({ children }: { children: ReactNode }) {
  const { participation } = useStudent();
  const startingTime = useMemo(
    () => addMilliseconds(participation.startingTime!, 1000 + Math.random() * 1000),
    [participation.startingTime],
  );

  const started = useIsAfter(startingTime);
  if (!started) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-2xl">
        La gara inizierà tra
        <span className="px-2">
          <Timer endTime={participation.startingTime!} />
        </span>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="h-[50vh]">
          <Loading />
        </div>
      }>
      {children}
    </Suspense>
  );
}
