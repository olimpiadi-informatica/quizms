import { useCallback } from "react";

import {
  type DocumentReference,
  doc,
  type FirestoreDataConverter,
  getDoc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { useErrorBoundary } from "react-error-boundary";
import useSWR, { type KeyedMutator, type MutatorOptions, type SWRConfiguration } from "swr";

import { useDb } from "~/web/common/base-login";

import { useSubscriptionListener } from "./subscription";

const mutationConfig: MutatorOptions = {
  revalidate: false,
  rollbackOnError: true,
  populateCache: true,
};

export function useDocument<T>(path: string, id: string, converter: FirestoreDataConverter<T>) {
  const [data, setData] = useDocumentOptional<T>(path, id, converter);
  if (!data) throw new Error(`Document ${path}/${id} not found`);
  return [data, setData] as const;
}

export function useDocumentOptional<T>(
  path: string,
  id: string,
  converter: FirestoreDataConverter<T>,
) {
  const db = useDb();
  const { showBoundary } = useErrorBoundary();

  const ref = doc(db, path, id).withConverter(converter);

  const swrConfig: SWRConfiguration = {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnMount: false,
    revalidateOnReconnect: false,
    suspense: true,
  };

  const { data, mutate } = useSWR<[T?]>(ref.path, () => fetcher(ref), swrConfig);

  useSubscriptionListener<[T?]>(
    ref.path,
    (setData) => {
      const unsubscribe = onSnapshot(
        ref,
        (snap) => {
          try {
            setData([snap.data()]);
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
