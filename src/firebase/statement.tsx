import React, { Suspense, useMemo } from "react";

import { addMilliseconds } from "date-fns";

import Loading from "~/core/components/loading";
import { useIsAfter } from "~/core/components/time";
import Timer from "~/core/components/timer";
import { RemoteStatement } from "~/core/student";
import { useStudent } from "~/core/student/provider";
import { statementConverter } from "~/firebase/converters";
import { useDocument } from "~/firebase/hooks";

export function FirebaseStatement() {
  const { school } = useStudent();
  const startingTime = useMemo(
    () => addMilliseconds(school.startingTime!, 1000 + Math.random() * 1000),
    [school.startingTime],
  );

  const started = useIsAfter(startingTime);

  if (!started)
    return (
      <div className="flex h-dvh justify-center">
        <div className="flex items-center justify-center text-2xl">
          La gara inizierà tra
          <span className="px-2">
            <Timer endTime={school.startingTime!} />
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
  const { student } = useStudent();

  const [statement] = useDocument("statements", student.variant!, statementConverter, {
    subscribe: true,
  });

  const url = useMemo(() => {
    const blob = new Blob([statement.statement], { type: "text/javascript" });
    return URL.createObjectURL(blob);
  }, [statement.statement]);

  return <RemoteStatement url={url} />;
}
