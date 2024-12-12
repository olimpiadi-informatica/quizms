import { type ReactNode, Suspense, useMemo } from "react";

import { WithinTimeRange } from "@olinfo/react-components";
import { addMilliseconds, differenceInMilliseconds } from "date-fns";

import useSWR from "swr/immutable";
import { Loading, Timer } from "~/web/components";
import { useStudent } from "~/web/student/provider";

export function BaseStatement({ children }: { children: ReactNode }) {
  const { participation } = useStudent();

  const { data: timeDelta } = useSWR(
    "time",
    async () => {
      const resp = await fetch("https://time1.olinfo.it/");
      return differenceInMilliseconds(new Date(Number(await resp.text())), new Date());
    },
    { suspense: true },
  );

  const startingTime = useMemo(
    () =>
      import.meta.env.QUIZMS_MODE === "print"
        ? new Date(0)
        : addMilliseconds(
            participation.startingTime!,
            1000 + Math.random() * 1000 + Math.abs(timeDelta),
          ),
    [participation.startingTime, timeDelta],
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
