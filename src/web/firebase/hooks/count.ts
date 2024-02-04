import { FirestoreDataConverter, Query, getCountFromServer } from "firebase/firestore";
import useSWR, { SWRConfiguration } from "swr";

import { useDb } from "~/web/firebase/base-login";
import query, { Constraints } from "~/web/firebase/query";

const emptyConverter: FirestoreDataConverter<any> = {
  toFirestore: (data) => data,
  fromFirestore: (data) => data,
};

type CountOptions<T> = {
  constraints?: Constraints<T>;
  group?: boolean;
};

export function useCount<T>(path: string, options?: CountOptions<T>) {
  const db = useDb();
  const q = query(db, path, emptyConverter, options);

  const swrConfig: SWRConfiguration = {
    revalidateOnMount: true,
    suspense: true,
  };

  const key = `${path}?${JSON.stringify(options)}`;
  const { data } = useSWR<number>(key, () => fetcher(q), swrConfig);

  return data!;
}

async function fetcher<T>(ref: Query<T>) {
  const snapshot = await getCountFromServer(ref);
  return snapshot.data().count;
}
