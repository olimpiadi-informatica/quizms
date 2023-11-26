import { useCallback, useState } from "react";

import { FirebaseError } from "firebase/app";
import { Auth, User, getAuth, onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import {
  DocumentReference,
  FirestoreDataConverter,
  Query,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy as orderByField,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import useSWR, { SWRConfiguration } from "swr";

import { useDb } from "~/firebase/login";

const swrConfig: SWRConfiguration = {
  revalidateOnMount: true,
  shouldRetryOnError: false,
  suspense: true,
};

export function useDocument<T>(
  path: string,
  id: string,
  converter: FirestoreDataConverter<T>,
  initialData?: T,
) {
  const db = useDb();
  const ref = doc(db, path, id).withConverter(converter);

  const { data, mutate, error } = useSWR<T>(`${path}/${id}`, () => fetcher(ref), {
    ...swrConfig,
    fallbackData: initialData,
  });
  if (error) throw error;

  const updateDocument = useCallback(
    (newData: T) => {
      void mutate(
        async () => {
          await setDoc(ref, newData);
          return newData;
        },
        {
          optimisticData: newData,
          revalidate: false,
          rollbackOnError: true,
          throwOnError: true,
        },
      );
    },
    [mutate, ref],
  );

  return [data as T, updateDocument] as const;

  async function fetcher<T>(ref: DocumentReference<T>) {
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      if (initialData) return initialData as T;
      throw new Error(`Document \`${ref.path}\` does not exist.`);
    }
    return snapshot.data({ serverTimestamps: "estimate" });
  }
}

export function useCollection<T>(
  path: string,
  converter: FirestoreDataConverter<T>,
  orderBy?: string,
  constraints?: Record<string, string>,
) {
  const db = useDb();
  const ref = collection(db, path).withConverter(converter);
  const q = query(
    ref,
    ...(orderBy ? [orderByField(orderBy)] : []),
    ...Object.entries(constraints ?? {}).map(([k, v]) => where(k, "==", v)),
  );

  const key = `${path}?${new URLSearchParams(constraints)}`;
  const { data, error } = useSWR<T[]>(key, () => fetcher(q), swrConfig);
  if (error) throw error;

  return data as T[];

  async function fetcher<T>(ref: Query<T>) {
    const snapshot = await getDocs(ref);
    return snapshot.docs.map((doc) => doc.data({ serverTimestamps: "estimate" }));
  }
}

export function useAuth() {
  const db = useDb();
  const auth = getAuth(db.app);

  const { data, error } = useSWR<User | null>("firebase/auth", () => fetcher(auth), swrConfig);
  if (error) throw error;

  return data as User | null;

  function fetcher(auth: Auth) {
    return new Promise<User | null>((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(auth, {
        next: (user) => {
          resolve(user);
          unsubscribe();
        },
        error: (error) => {
          reject(error);
          unsubscribe();
        },
        complete: () => {
          resolve(null);
          unsubscribe();
        },
      });
    });
  }
}

export function useSignInWithPassword() {
  const db = useDb();
  const auth = getAuth(db.app);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<FirebaseError>();

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError(undefined);
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (error) {
        setError(error as FirebaseError);
      }
      setLoading(false);
    },
    [auth],
  );

  return { signInWithPassword, loading, error };
}
