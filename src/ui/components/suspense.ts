import { useErrorBoundary } from "react-error-boundary";
import useSWR from "swr/immutable";

export default function useSuspense<T>(fn: () => Promise<T>) {
  const { showBoundary } = useErrorBoundary();

  if (!fn.name) throw new Error("useSuspense requires a named function");

  const { data, error } = useSWR(
    fn.name,
    async () => {
      const value = await fn();
      return { value };
    },
    {
      shouldRetryOnError: false,
      suspense: true,
    },
  );

  if (error) showBoundary(error);

  return data.value;
}
