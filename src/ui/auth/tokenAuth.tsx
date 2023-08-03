import React, { ComponentType, useCallback, useEffect, useState } from "react";

import * as quizms from "@/ui";

import Progress from "../components/progress";
import { NoAuth } from "./noAuth";

type AuthProps = {
  header: ComponentType;
};

export function TokenAuth({ header }: AuthProps) {
  const [Content, setContent] = useState<ComponentType>();

  const init = useCallback(async () => {
    const res = await fetch("/bundle/contest-default.iife.js");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    Object.assign(globalThis, { quizms, React });
    const { default: Contest } = await import(/* @vite-ignore */ url);
    setContent(() => Contest);
  }, []);

  useEffect(() => {
    void init();
  }, [init]);

  return <NoAuth header={header}>{Content ? <Content /> : <Loading />}</NoAuth>;
}

function Loading() {
  return (
    <div className="m-auto h-32 w-64">
      <Progress>Caricamento in corso...</Progress>
    </div>
  );
}
