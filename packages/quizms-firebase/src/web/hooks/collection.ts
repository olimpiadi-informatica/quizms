import { useCallback } from "react";

import { type FirestoreDataConverter, getDocs, onSnapshot, type Query } from "firebase/firestore";
import { sortBy } from "lodash-es";
import { useErrorBoundary } from "react-error-boundary";
import useSWR, { type KeyedMutator, type MutatorOptions, type SWRConfiguration } from "swr";

import { useDb } from "~/web/common/base-login";
import query, { type QueryOption } from "~/web/common/query";

import { useSubscriptionListener } from "./subscription";

const mutationConfig: MutatorOptions = {
  revalidate: false,
  rollbackOnError: true,
  populateCache: true,
};

export function useCollection<T extends { id: string }>(
  path: string,
  converter: FirestoreDataConverter<T>,
  options?: QueryOption<T>,
) {
  const db = useDb();
  const { showBoundary } = useErrorBoundary();

  const q = query(db, path, converter, options);

  const swrConfig: SWRConfiguration = {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnMount: false,
    revalidateOnReconnect: false,
    suspense: true,
  };

  const key = `${path}?${JSON.stringify(options)}`;
  const { data, mutate } = useSWR<T[]>(key, () => fetcher(q), swrConfig);

  /**
   * Shows `newDoc` in the collection immediately and saves it with `save` (clients can't write to
   * Firestore directly, writes go through the API). The change is rolled back if `save` fails.
   */
  const setData = useCallback(
    (newDoc: T, save: (doc: T) => Promise<unknown>) => setDocument(newDoc, save, mutate, options),
    [mutate, options],
  );

  useSubscriptionListener<T[]>(
    key,
    (setData) => {
      const unsubscribe = onSnapshot(
        q,
        { includeMetadataChanges: true },
        (snap) => {
          // Local snapshots have null server timestamps, the optimistic update already covers them.
          if (snap.metadata.hasPendingWrites) return;
          try {
            setData(snap.docs.map((doc) => doc.data()));
          } catch (err) {
            showBoundary(err as Error);
          }
        },
        (error) => showBoundary(error),
      );
      return () => unsubscribe();
    },
    (data) => mutate(data, mutationConfig),
  );

  return [data as T[], setData] as const;
}

async function setDocument<T extends { id: string }>(
  newDoc: T,
  save: (doc: T) => Promise<unknown>,
  mutator: KeyedMutator<T[]>,
  options?: QueryOption<T>,
): Promise<void> {
  await mutator(
    async (prev) => {
      await save(newDoc);
      return merge(prev, newDoc, options);
    },
    {
      ...mutationConfig,
      optimisticData: (prev) => merge(prev, newDoc, options),
    },
  );
}

function merge<T extends { id: string }>(
  prev: T[] | undefined,
  newDoc: T,
  options?: QueryOption<T>,
) {
  if (!prev) return [newDoc];
  let coll = prev.filter((doc) => newDoc.id !== doc.id);
  coll.push(newDoc);
  coll = sortBy(coll, [options?.orderBy ?? "id"]);
  if (options?.limit) coll = coll.slice(0, options.limit);
  return coll;
}

async function fetcher<T>(ref: Query<T>) {
  const snapshot = await getDocs(ref);
  return snapshot.docs.map((doc) => doc.data({ serverTimestamps: "estimate" }));
}
