import React, { Suspense, useMemo } from "react";

import { addMilliseconds } from "date-fns";
import { getDownloadURL, getStorage, ref } from "firebase/storage";

import Loading from "~/web/components/loading";
import { useIsAfter } from "~/web/components/time";
import Timer from "~/web/components/timer";
import { RemoteStatement, useStudent } from "~/web/student";

import { useDb } from "./baseLogin";

export function FirebaseStatement() {
  const { participation } = useStudent();
  const startingTime = useMemo(
    () => addMilliseconds(participation.startingTime!, 1000 + Math.random() * 1000),
    [participation.startingTime],
  );

  const started = useIsAfter(startingTime);

  if (!started)
    return (
      <div className="flex h-[50vh] items-center justify-center text-2xl">
        La gara inizierà tra
        <span className="px-2">
          <Timer endTime={participation.startingTime!} />
        </span>
      </div>
    );

  return (
    <Suspense
      fallback={
        <div className="h-[50vh]">
          <Loading />
        </div>
      }>
      <ContestInner />
    </Suspense>
  );
}

function ContestInner() {
  const db = useDb();
  const { contest, student } = useStudent();

  const storage = getStorage(db.app);

  const statementRef = ref(
    storage,
    `statements/${student.variant!}/statement-${contest.statementVersion}.js`,
  );

  return <RemoteStatement id={statementRef.fullPath} url={() => getDownloadURL(statementRef)} />;
}
