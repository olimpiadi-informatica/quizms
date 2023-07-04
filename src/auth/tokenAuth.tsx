import React, { ComponentType, useEffect, useState } from "react";

import { NoAuth } from "@/auth";
import * as quizms from "@/ui";

type AuthProps = {
  header: ComponentType<Record<any, never>>;
};

export function TokenAuth({ header }: AuthProps) {
  const [Contest, setContest] = useState<ComponentType<Record<any, never>>>();

  const init = async () => {
    const res = await fetch("/contest.bundle.js");
    const text = await res.text();
    const fn = new Function("quizms", "react", `${text}\nreturn quizmsContest;`);
    setContest(() => fn(quizms, React));
  };

  useEffect(() => {
    void init();
  }, []);

  return (
    <NoAuth header={header}>
      {Contest ? <Contest /> : <p className="m-4">Caricamento in corso...</p>}
    </NoAuth>
  );
}
