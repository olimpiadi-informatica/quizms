import { useCallback } from "react";

import {
  DocumentReference,
  FirestoreDataConverter,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { useErrorBoundary } from "react-error-boundary";
import useSWR, { KeyedMutator, MutatorOptions, SWRConfiguration } from "swr";

import { useDb } from "~/firebase/baseLogin";

import { useSubscriptionListener } from "./subscription";

const mutationConfig: MutatorOptions = {
  revalidate: false,
  rollbackOnError: true,
  populateCache: true,
};

type Options = {
  subscribe?: boolean;
};

export function useDocument<T>(
  path: string,
  id: string,
  converter: FirestoreDataConverter<T>,
  options?: Options,
) {
  const [data, setData] = useDocumentOptional<T>(path, id, converter, options);
  if (!data) throw new Error(`Document ${path}/${id} not found`);
  return [data, setData] as const;
}

export function useDocumentOptional<T>(
  path: string,
  id: string,
  converter: FirestoreDataConverter<T>,
  options?: Options,
) {
  const db = useDb();
  const { showBoundary } = useErrorBoundary();

  const ref = doc(db, path, id).withConverter(converter);

  const swrConfig: SWRConfiguration = {
    revalidateIfStale: !options?.subscribe,
    revalidateOnFocus: !options?.subscribe,
    revalidateOnMount: !options?.subscribe,
    revalidateOnReconnect: !options?.subscribe,
    suspense: true,
  };

  const key = `${ref.path}?${JSON.stringify(options)}`;
  const { data, mutate } = useSWR<[T | null]>(key, () => fetcher(ref), swrConfig);

  useSubscriptionListener<[T | null]>(
    key,
    (setData) => {
      if (!options?.subscribe) return;
      const unsubscribe = onSnapshot(
        ref,
        (snap) => setData([snap.data() ?? null]),
        (error) => showBoundary(error),
      );
      return () => unsubscribe();
    },
    (data) => mutate(data, mutationConfig),
  );

  const setData = useCallback((newData: T) => setDocument<T>(ref, newData, mutate), [mutate, ref]);
  return [data![0], setData] as const;
}

async function setDocument<T>(
  ref: DocumentReference<T>,
  newDoc: T,
  mutator: KeyedMutator<[T | null]>,
) {
  await mutator(
    async () => {
      await setDoc(ref, newDoc);
      return [newDoc];
    },
    { ...mutationConfig, optimisticData: [newDoc] },
  );
}

async function fetcher<T>(ref: DocumentReference<T>): Promise<[T | null]> {
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) {
    return [null];
  }
  return [snapshot.data({ serverTimestamps: "estimate" })];
}
