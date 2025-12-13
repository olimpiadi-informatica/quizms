import { useCallback } from "react";

import {
  type CollectionReference,
  collection,
  doc,
  type FirestoreDataConverter,
  getDocs,
  onSnapshot,
  type Query,
  setDoc,
} from "firebase/firestore";
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

  const ref = collection(db, path).withConverter(converter);
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

  const setData = useCallback(
    (newDoc: T) => setDocument(ref, newDoc, mutate, options),
    [ref, mutate, options],
  );

  useSubscriptionListener<T[]>(
    key,
    (setData) => {
      const unsubscribe = onSnapshot(
        q,
        (snap) => {
          try {
            setData(snap.docs.map((doc) => doc.data()));
          } catch (err) {
            showBoundary(err);
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
  ref: CollectionReference<T>,
  newDoc: T,
  mutator: KeyedMutator<T[]>,
  options?: QueryOption<T>,
): Promise<void> {
  await mutator(
    async (prev) => {
      const docRef = doc(ref, newDoc.id);
      await setDoc(docRef, newDoc);
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
