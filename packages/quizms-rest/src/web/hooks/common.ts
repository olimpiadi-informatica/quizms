import { validate } from "@olinfo/quizms/utils";
import ky from "ky";
import useSWR from "swr";
import type z from "zod";

export function useRestData<Out>(url: string, schema: z.core.$ZodType<Out>) {
  return useSWR(
    url,
    () =>
      ky
        .get(url)
        .json()
        .then((j) => validate(schema, j)),
    {
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnMount: false,
      revalidateOnReconnect: false,
      refreshInterval: 5000,
      suspense: true,
    },
  );
}
