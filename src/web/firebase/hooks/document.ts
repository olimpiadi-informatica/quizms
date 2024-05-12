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

import { useDb } from "~/web/firebase/base-login";

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
  const { data, mutate } = useSWR<[T?]>(key, () => fetcher(ref), swrConfig);

  useSubscriptionListener<[T?]>(
    key,
    (setData) => {
      if (!options?.subscribe) return;
      const unsubscribe = onSnapshot(
        ref,
        (snap) => {
          try {
            setData([snap.data()]);
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

  const setData = useCallback((newData: T) => setDocument<T>(ref, newData, mutate), [mutate, ref]);
  return [data![0], setData] as const;
}

async function setDocument<T>(ref: DocumentReference<T>, newDoc: T, mutator: KeyedMutator<[T?]>) {
  await mutator(
    async () => {
      await setDoc(ref, newDoc);
      return [newDoc];
    },
    { ...mutationConfig, optimisticData: [newDoc] },
  );
}

async function fetcher<T>(ref: DocumentReference<T>): Promise<[T?]> {
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) {
    return [undefined];
  }
  return [snapshot.data({ serverTimestamps: "estimate" })];
}
