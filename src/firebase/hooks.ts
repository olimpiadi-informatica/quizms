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
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { SWRConfiguration } from "swr";
import useSWR from "swr/immutable";

import { useDb } from "~/firebase/login";

const swrConfig: SWRConfiguration = {
  shouldRetryOnError: false,
  suspense: true,
};

export function useDocument<T>(path: string, converter: FirestoreDataConverter<T>) {
  const db = useDb();
  const ref = doc(db, path).withConverter(converter);

  const { data, mutate, error } = useSWR<T>(path, () => fetcher(ref), swrConfig);
  if (error) throw error;

  const updateDocument = (newData: T) => {
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
  };

  return [data as T, updateDocument] as const;

  async function fetcher<T>(ref: DocumentReference<T>) {
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) throw new Error(`Document \`${ref.path}\` does not exist.`);
    return snapshot.data()!;
  }
}

export function useCollection<T>(
  path: string,
  converter: FirestoreDataConverter<T>,
  constraints?: Record<string, string>,
) {
  const db = useDb();
  const q = query(
    collection(db, path).withConverter(converter),
    ...Object.entries(constraints ?? {}).map(([k, v]) => where(k, "==", v)),
  );

  const key = `${path}?${new URLSearchParams(constraints)}`;

  const { data, error } = useSWR<T[]>(key, () => fetcher(q), swrConfig);
  if (error) throw error;

  return data as T[];

  async function fetcher<T>(ref: Query<T>) {
    const snapshot = await getDocs(ref);
    return snapshot.docs.map((doc) => doc.data());
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
