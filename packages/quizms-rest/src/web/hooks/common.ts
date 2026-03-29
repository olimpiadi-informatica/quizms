import { validate } from "@olinfo/quizms/utils";
import ky from "ky";
import useSWR, { type SWRConfiguration } from "swr";
import type z from "zod";

export function useRestData<Out>(url: string, schema: z.core.$ZodType<Out>) {
  const swrConfig: SWRConfiguration = {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnMount: false,
    revalidateOnReconnect: false,
    refreshInterval: 5000,
    suspense: true,
  };

  return useSWR<Out>(
    url,
    () =>
      ky
        .get(url)
        .json()
        .then((j) => validate(schema, j)),
    swrConfig,
  );
}
