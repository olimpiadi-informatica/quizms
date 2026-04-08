import { validate } from "@olinfo/quizms/utils";
import useSWR from "swr";
import type z from "zod";

import api from "../common/api";

export function useRestData<Out>(url: string, schema: z.core.$ZodType<Out>) {
  return useSWR(
    url,
    () =>
      api
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
