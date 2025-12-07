"use client";

import { AsyncPool } from "@olinfo/quizms/utils";
import useSWR from "swr/immutable";

import { Image } from "./image";

type AsySrc = {
  fileName: object;
  hash: string;
  inject: object | null;
};

type Props = {
  src: AsySrc;
  alt: string;
  title?: string;
};

export function Asymptote({ src, alt, title }: Props) {
  const { data, isLoading } = useSWR(["asy", src], ([, src]) => compileAsy(src), {
    keepPreviousData: true,
  });

  return <Image alt={alt} title={title} src={data} isLoading={isLoading} />;
}
Asymptote.displayName = "Asymptote";

const pool = new AsyncPool(navigator.hardwareConcurrency);

function compileAsy(src: AsySrc) {
  return pool.run(async () => {
    const res = await fetch("/asy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(src),
    });
    if (!res.ok) throw new Error("Failed to compile asymptote");
    return res.json();
  });
}
