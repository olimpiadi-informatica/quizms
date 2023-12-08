import { useCallback, useState } from "react";

import { FirebaseError } from "firebase/app";
import {
  Auth,
  User,
  UserCredential,
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  DocumentReference,
  FirestoreDataConverter,
  Query,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { compact } from "lodash-es";
import useSWR, { MutatorOptions, SWRConfiguration } from "swr";

import { useDb } from "./login";

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

export function useDocument<T>(path: string, id: string, converter: FirestoreDataConverter<T>) {
  const db = useDb();
  const ref = doc(db, path, id).withConverter(converter);

  const { data, mutate, error } = useSWR<T>(`${path}/${id}`, () => fetcher(ref), swrConfig);
  if (error) throw error;

  const updateDocument = useCallback(
    (newData: T) => {
      void mutate(
        async () => {
          await setDoc(ref, newData);
          return newData;
        },
        { ...mutationConfig, optimisticData: newData },
      );
    },
    [mutate, ref],
  );

  return [data as T, updateDocument] as const;

  async function fetcher<T>(ref: DocumentReference<T>) {
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      throw new Error(`Document \`${ref.path}\` does not exist.`);
    }
    return snapshot.data({ serverTimestamps: "estimate" });
  }
}

export function useCollection<
  T extends {
    id: string;
  },
>(
  path: string,
  converter: FirestoreDataConverter<T>,
  options?: {
    constraints?: Record<string, string | string[]>;
    orderBy?: string;
    orderByDesc?: string;
    limit?: number;
  },
) {
  const db = useDb();
  const ref = collection(db, path).withConverter(converter);
  const q = query(
    ref,
    ...Object.entries(options?.constraints ?? {}).map(([k, v]) =>
      where(k, Array.isArray(v) ? "in" : "==", v),
    ),
    ...compact([
      options?.orderBy && orderBy(options.orderBy),
      options?.orderByDesc && orderBy(options.orderByDesc, "desc"),
      options?.limit && limit(options.limit),
    ]),
  );

  const params = {
    ...options?.constraints,
    orderBy: options?.orderBy,
    orderByDesc: options?.orderByDesc,
    limit: options?.limit?.toString(),
  } as Record<string, string>;

  const key = `${path}?${new URLSearchParams(params)}`;
  const { data, mutate, error } = useSWR<T[]>(key, () => fetcher(q), swrConfig);
  if (error) throw error;

  const setDocument = useCallback(
    async (newDoc: T) => {
      // TODO: orderBy, limit
      function merge(prev: T[] | undefined) {
        if (!prev) return [newDoc];
        const index = prev.findIndex((doc) => doc.id === newDoc.id);
        if (index === -1) return [...prev, newDoc];
        return prev.map((doc, i) => (i === index ? newDoc : doc));
      }

      await mutate(
        async (prev) => {
          const docRef = doc(ref, newDoc.id);
          await setDoc(docRef, newDoc);
          return merge(prev);
        },
        { ...mutationConfig, optimisticData: merge },
      );
    },
    [mutate, ref],
  );

  return [data as T[], setDocument] as const;

  async function fetcher<T>(ref: Query<T>) {
    const snapshot = await getDocs(ref);
    return snapshot.docs.map((doc) => doc.data({ serverTimestamps: "estimate" }));
  }
}

export function useAuth() {
  const params = new URLSearchParams(window.location.search);
  const email = params.get("email");
  const password = params.get("password");

  const db = useDb();
  const auth = getAuth(db.app);

  const key = `firebase/auth?${params}`;
  const { data, error } = useSWR<User | null>(key, () => fetcher(auth, email, password), swrConfig);
  if (error) throw error;

  return data as User | null;

  async function fetcher(auth: Auth, email: string | null, password: string | null) {
    if (email && password) {
      let credential: UserCredential | undefined = undefined;
      try {
        credential = await signInWithEmailAndPassword(auth, email, password);
      } catch (e) {
        console.warn("Failed to sign in with precompiled credentials.");
      }

      window.history.replaceState(null, "", window.location.pathname);
      if (credential) return credential.user;
    }

    return waitAuth(auth);
  }
}

export function useAnonymousAuth() {
  const db = useDb();
  const auth = getAuth(db.app);

  const { data, error } = useSWR<User | null>(
    "firebase/anonymousAuth",
    () => fetcher(auth),
    swrConfig,
  );
  if (error) throw error;

  return data as User;

  async function fetcher(auth: Auth) {
    const credential = await signInAnonymously(auth);
    return credential.user;
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

function waitAuth(auth: Auth) {
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
