import {
  type DocumentReference,
  doc,
  type FirestoreDataConverter,
  getDoc,
  onSnapshot,
} from "firebase/firestore";
import { useErrorBoundary } from "react-error-boundary";
import useSWR, { type MutatorOptions, type SWRConfiguration } from "swr";

import { useDb } from "~/web/common/base-login";

import { useSubscriptionListener } from "./subscription";

const mutationConfig: MutatorOptions = {
  revalidate: false,
  rollbackOnError: true,
  populateCache: true,
};

export function useDocument<T>(path: string, id: string, converter: FirestoreDataConverter<T>) {
  const [data] = useDocumentOptional<T>(path, id, converter);
  if (!data) throw new Error(`Document ${path}/${id} not found`);
  return [data] as const;
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
        { includeMetadataChanges: true },
        (snap) => {
          // Local snapshots have null server timestamps, the optimistic update already covers them.
          if (snap.metadata.hasPendingWrites) return;
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

  // Clients can't write to Firestore directly: writes go through the API.
  return [data![0]] as const;
}

async function fetcher<T>(ref: DocumentReference<T>): Promise<[T?]> {
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) {
    return [undefined];
  }
  return [snapshot.data({ serverTimestamps: "estimate" })];
}
