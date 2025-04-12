import { type ReactNode, Suspense, useMemo } from "react";

import { WithinTimeRange } from "@olinfo/react-components";
import { addMilliseconds } from "date-fns";

import { Loading, Timer } from "~/web/components";
import { useStudent } from "~/web/student/provider";

export function BaseStatement({ children }: { children: ReactNode }) {
  const { participation } = useStudent();
  const startingTime = useMemo(
    () =>
      process.env.QUIZMS_MODE === "print"
        ? new Date(0)
        : addMilliseconds(participation.startingTime!, 1000 + Math.random() * 1000),
    [participation.startingTime],
  );

  return (
    <>
      <WithinTimeRange end={startingTime}>
        <div className="flex h-[50vh] items-center justify-center text-2xl">
          La gara inizierà tra
          <span className="px-2">
            <Timer endTime={participation.startingTime!} />
          </span>
        </div>
      </WithinTimeRange>
      <WithinTimeRange start={startingTime}>
        <Suspense
          fallback={
            <div className="h-[50vh]">
              <Loading />
            </div>
          }>
          {children}
        </Suspense>
      </WithinTimeRange>
    </>
  );
}
