import { useCallback } from "react";

import {
  CollectionReference,
  FirestoreDataConverter,
  Query,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { sortBy } from "lodash-es";
import { useErrorBoundary } from "react-error-boundary";
import useSWR, { KeyedMutator, MutatorOptions, SWRConfiguration } from "swr";

import { useDb } from "~/firebase/baseLogin";

import { useSubscriptionListener } from "./subscription";

const mutationConfig: MutatorOptions = {
  revalidate: false,
  rollbackOnError: true,
  populateCache: true,
};

type CollectionOptions<T> = {
  constraints?: { [P in keyof T]?: T[P] | T[P][] };
  orderBy?: string;
  limit?: number;
  subscribe?: boolean;
};

export function useCollection<
  T extends {
    id: string;
  },
>(path: string, converter: FirestoreDataConverter<T>, options?: CollectionOptions<T>) {
  const db = useDb();
  const { showBoundary } = useErrorBoundary();

  const ref = collection(db, path).withConverter(converter);
  let q: Query<T> = ref;
  for (const [k, v] of Object.entries(options?.constraints ?? {})) {
    q = query(q, where(k, Array.isArray(v) ? "in" : "==", v));
  }

  if (options?.orderBy) q = query(q, orderBy(options.orderBy));
  if (options?.limit) q = query(q, limit(options.limit));

  const swrConfig: SWRConfiguration = {
    revalidateIfStale: !options?.subscribe,
    revalidateOnFocus: !options?.subscribe,
    revalidateOnMount: !options?.subscribe,
    revalidateOnReconnect: !options?.subscribe,
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
      if (!options?.subscribe) return;
      const unsubscribe = onSnapshot(
        q,
        async (snap) => {
          setData(snap.docs.map((doc) => doc.data()));
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
  options?: CollectionOptions<T>,
): Promise<void> {
  await mutator(
    async (prev) => {
      const docRef = doc(ref, newDoc.id);
      await setDoc(docRef, newDoc);
      return merge(prev, [newDoc], options);
    },
    {
      ...mutationConfig,
      optimisticData: (prev) => merge(prev, [newDoc], options),
    },
  );
}

function merge<T extends { id: string }>(
  prev: T[] | undefined,
  newDocs: T[],
  options?: CollectionOptions<T>,
) {
  if (!prev) return newDocs;
  let coll = prev.filter((doc) => !newDocs.find((newDoc) => newDoc.id === doc.id));
  coll.push(...newDocs);
  coll = sortBy(coll, [options?.orderBy ?? "id"]);
  if (options?.limit) coll = coll.slice(0, options.limit);
  return coll;
}

async function fetcher<T>(ref: Query<T>) {
  const snapshot = await getDocs(ref);
  return snapshot.docs.map((doc) => doc.data({ serverTimestamps: "estimate" }));
}
