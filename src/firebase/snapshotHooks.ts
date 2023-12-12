import { FirebaseError } from "firebase/app";
import {
  FirestoreDataConverter,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { compact } from "lodash-es";
import { useErrorBoundary } from "react-error-boundary";
import { SWRConfiguration } from "swr";
import useSWRSubscription, { SWRSubscriptionOptions } from "swr/subscription";

import { useDb } from "~/firebase/login";

const swrConfig: SWRConfiguration = {
  revalidateOnMount: true,
  shouldRetryOnError: false,
};

export function useCollectionSnapshot<T>(
  path: string,
  converter: FirestoreDataConverter<T>,
  options?: {
    constraints?: Record<string, string | string[]>;
    orderBy?: string;
    orderByDesc?: string;
    limit?: number;
  },
) {
  const db = useDb();
  const { showBoundary } = useErrorBoundary();

  const ref = collection(db, path).withConverter(converter);
  const q = query(
    ref,
    ...Object.entries(options?.constraints ?? {}).map(([k, v]) =>
      where(k, Array.isArray(v) ? "in" : "==", v),
    ),
    ...compact([
      options?.orderBy && orderBy(options.orderBy),
      options?.orderByDesc && orderBy(options.orderByDesc, "desc"),
      options?.limit && limit(options.limit),
    ]),
  );

  const params = {
    ...options?.constraints,
    orderBy: options?.orderBy,
    orderByDesc: options?.orderByDesc,
    limit: options?.limit?.toString(),
  } as Record<string, string>;

  const key = `${path}?${new URLSearchParams(params)}`;

  const { data, error } = useSWRSubscription<T[], FirebaseError, string>(key, subscribe, swrConfig);

  if (error) showBoundary(error);

  return data;

  function subscribe(_key: string, { next }: SWRSubscriptionOptions<T[], FirebaseError>) {
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        next(
          null,
          snap.docs.map((doc) => doc.data()),
        );
      },
      (error) => next(error),
    );
    return () => unsubscribe();
  }
}
