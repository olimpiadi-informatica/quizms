import React, { ComponentType } from "react";

import useSWR from "swr/immutable";

import * as quizms from "@/ui";

import Progress from "../components/progress";
import { NoAuth } from "./noAuth";

type AuthProps = {
  header: ComponentType;
};

async function fetcher(variant: string) {
  const res = await fetch(`/bundle/contest-${variant}.iife.js`);
  if (!res.ok) throw new Error(res.statusText);

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  Object.assign(globalThis, { quizms, React });
  const { default: Contest } = await import(/* @vite-ignore */ url);

  return Contest;
}

export function TokenAuth({ header }: AuthProps) {
  const { data: Contest, error, isLoading } = useSWR("default", fetcher);

  return (
    <NoAuth header={header}>
      {isLoading ? (
        <div className="m-auto h-32 w-64">
          <Progress>Caricamento in corso...</Progress>
        </div>
      ) : error ? (
        <div>Errore: {error}</div>
      ) : (
        <Contest />
      )}
    </NoAuth>
  );
}
