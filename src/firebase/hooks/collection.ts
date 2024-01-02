import { useCallback, useEffect } from "react";

import {
  Firestore,
  FirestoreDataConverter,
  Query,
  collection,
  collectionGroup,
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

const swrConfig: SWRConfiguration = {
  revalidateOnMount: true,
  shouldRetryOnError: false,
  suspense: true,
};

const mutationConfig: MutatorOptions = {
  revalidate: false,
  rollbackOnError: true,
  populateCache: true,
};

type CollectionSortingOptions =
  | {
      orderBy?: string;
      orderByDesc?: undefined;
    }
  | {
      orderBy?: undefined;
      orderByDesc?: string;
    };

type CollectionOptions<T> = {
  constraints?: { [P in keyof T]?: T[P] | T[P][] };
  limit?: number;
  subscribe?: boolean;
  group?: boolean;
} & CollectionSortingOptions;

export function useCollection<
  T extends {
    id: string;
  },
>(path: string, converter: FirestoreDataConverter<T>, options?: CollectionOptions<T>) {
  const db = useDb();
  const { showBoundary } = useErrorBoundary();

  let q = (options?.group ? collectionGroup : collection)(db, path).withConverter(converter);
  for (const [k, v] of Object.entries(options?.constraints ?? {})) {
    q = query(q, where(k, Array.isArray(v) ? "in" : "==", v));
  }

  if (options?.orderBy) q = query(q, orderBy(options.orderBy));
  if (options?.orderByDesc) q = query(q, orderBy(options.orderByDesc, "desc"));
  if (options?.limit) q = query(q, limit(options.limit));

  const key = `${path}?${JSON.stringify(options)}`;
  const { data, mutate, error } = useSWR<T[]>(key, () => fetcher(q), swrConfig);
  if (error) showBoundary(error);

  const setData = useCallback(
    async (newDoc: T) => {
      if (options?.group) throw new Error("Cannot mutate document on collection group.");
      await setDocument(db, path, newDoc, mutate, options);
    },
    [mutate, db, path, options],
  );

  useEffect(() => {
    if (!options?.subscribe) return;
    const unsubscribe = onSnapshot(
      q,
      async (snap) => {
        await mutate(snap.docs.map((doc) => doc.data()));
      },
      (error) => showBoundary(error),
    );
    return () => unsubscribe();
  });

  return [data as T[], setData] as const;
}

async function setDocument<T extends { id: string }>(
  db: Firestore,
  path: string,
  newDoc: T,
  mutator: KeyedMutator<T[]>,
  options?: CollectionOptions<T>,
): Promise<void> {
  await mutator(
    async (prev) => {
      const docRef = doc(db, path, newDoc.id);
      await setDoc(docRef, newDoc);
      return merge(prev, newDoc, options);
    },
    { ...mutationConfig, optimisticData: (prev) => merge(prev, newDoc, options) },
  );
}

function merge<T extends { id: string }>(
  coll: T[] | undefined,
  newDoc: T,
  options?: CollectionOptions<T>,
) {
  if (!coll) return [newDoc];
  coll = coll.filter((doc) => doc.id !== newDoc.id);
  coll.push(newDoc);
  coll = sortBy(coll, [options?.orderBy ?? options?.orderByDesc ?? "id"]);
  if (options?.orderByDesc) coll.reverse();
  if (options?.limit) coll = coll.slice(0, options.limit);
  return coll;
}

async function fetcher<T>(ref: Query<T>) {
  const snapshot = await getDocs(ref);
  return snapshot.docs.map((doc) => doc.data({ serverTimestamps: "estimate" }));
}
