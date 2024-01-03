import { useCallback, useEffect } from "react";

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

const swrConfig: SWRConfiguration = {
  revalidateOnMount: true,
  suspense: true,
};

const mutationConfig: MutatorOptions = {
  revalidate: false,
  rollbackOnError: true,
  populateCache: true,
};

type Options = {
  subscribe?: boolean;
  throwIfMissing?: boolean;
};

export function useDocument<T>(
  path: string,
  id: string,
  converter: FirestoreDataConverter<T>,
  options?: Options,
) {
  const db = useDb();
  const { showBoundary } = useErrorBoundary();

  const ref = doc(db, path, id).withConverter(converter);

  const { data, mutate, error } = useSWR<T>(
    `${path}/${id}`,
    () => fetcher(ref, options),
    swrConfig,
  );
  if (error) showBoundary(error);

  useEffect(() => {
    if (!options?.subscribe) return;
    const unsubscribe = onSnapshot(
      ref,
      (snap) => mutate(snap.data()),
      (error) => showBoundary(error),
    );
    return () => unsubscribe();
  });

  const setData = useCallback((newData: T) => setDocument<T>(ref, newData, mutate), [mutate, ref]);
  return [data as T, setData] as const;
}

async function setDocument<T>(ref: DocumentReference<T>, newDoc: T, mutator: KeyedMutator<T>) {
  await mutator(
    async () => {
      await setDoc(ref, newDoc);
      return newDoc;
    },
    { ...mutationConfig, optimisticData: newDoc },
  );
}

async function fetcher<T>(ref: DocumentReference<T>, options?: Options) {
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) {
    if (options?.throwIfMissing !== false) {
      throw new Error(`Document \`${ref.path}\` does not exist.`);
    }
    return null as T;
  }
  return snapshot.data({ serverTimestamps: "estimate" });
}
