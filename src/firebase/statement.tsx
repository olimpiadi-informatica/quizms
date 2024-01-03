import React, { Suspense, useMemo } from "react";

import { addMilliseconds } from "date-fns";
import { getDownloadURL, getStorage, ref } from "firebase/storage";
import { useErrorBoundary } from "react-error-boundary";
import useSWR from "swr/immutable";

import Loading from "~/core/components/loading";
import { useIsAfter } from "~/core/components/time";
import Timer from "~/core/components/timer";
import { RemoteStatement } from "~/core/student";
import { useStudent } from "~/core/student/provider";

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
      <div className="flex h-dvh justify-center">
        <div className="flex items-center justify-center text-2xl">
          La gara inizierà tra
          <span className="px-2">
            <Timer endTime={participation.startingTime!} />
          </span>
        </div>
      </div>
    );

  return (
    <Suspense fallback={<Loading />}>
      <ContestInner />
    </Suspense>
  );
}

function ContestInner() {
  const db = useDb();
  const { contest, student } = useStudent();
  const { showBoundary } = useErrorBoundary();

  const storage = getStorage(db.app);

  const statementRef = ref(
    storage,
    `statements/${student.variant!}/statement-${contest.statementVersion}.js`,
  );

  const { data, error } = useSWR(statementRef.fullPath, () => getDownloadURL(statementRef), {
    suspense: true,
  });
  if (error) showBoundary(error);

  return <RemoteStatement url={data!} />;
}
