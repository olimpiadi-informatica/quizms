import React, { ComponentType } from "react";

import useSWR from "swr/immutable";

import { components } from "~/ui/mdxComponents";

import Progress from "../components/progress";
import { NoAuth } from "./noAuth";

type AuthProps = {
  header: ComponentType;
  duration: object;
};

async function fetcher(variant: string) {
  const res = await fetch(`/bundle/contest-${variant}.mjs`);
  if (!res.ok) throw new Error(res.statusText);

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  const { default: contest } = await import(/* @vite-ignore */ url);

  return () => contest(React, components);
}

export function TokenAuth({ header, duration }: AuthProps) {
  const { data: Contest, error, isLoading } = useSWR("default", fetcher);

  return (
    <NoAuth header={header} duration={duration}>
      {isLoading ? (
        <div className="m-auto h-64 w-64">
          <Progress>Caricamento in corso...</Progress>
        </div>
      ) : error ? (
        <div>{`${error}`}</div>
      ) : Contest ? (
        <Contest />
      ) : null}
    </NoAuth>
  );
}
