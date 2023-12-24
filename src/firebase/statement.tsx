import React, { Suspense, useMemo, useState } from "react";

import { addMilliseconds } from "date-fns";

import Loading from "~/core/components/loading";
import { useUpdateAt } from "~/core/components/time";
import Timer from "~/core/components/timer";
import { RemoteStatement } from "~/core/student";
import { useStudent } from "~/core/student/provider";
import { variantConverter } from "~/firebase/converters";
import { useDocument } from "~/firebase/hooks";

export function FirebaseStatement() {
  const { school } = useStudent();

  const [started, setStarted] = useState(false);
  useUpdateAt(addMilliseconds(school.startingTime!, 1000 + Math.random() * 1000), () =>
    setStarted(true),
  );

  if (!started)
    return (
      <div className="flex h-screen justify-center">
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

  const [variant] = useDocument("variants", student.variant!, variantConverter, {
    subscribe: true,
  });

  const url = useMemo(() => {
    const blob = new Blob([variant.statement], { type: "text/javascript" });
    return URL.createObjectURL(blob);
  }, [variant.statement]);

  return <RemoteStatement url={url} />;
}
