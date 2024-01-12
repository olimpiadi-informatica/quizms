import { useCallback, useState } from "react";

import { FirebaseError } from "firebase/app";
import {
  User,
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { noop } from "lodash-es";
import { useErrorBoundary } from "react-error-boundary";
import { SWRConfiguration } from "swr";
import useSWR from "swr/immutable";

import { useDb } from "~/web/firebase/base-login";

import { useSubscription } from "./subscription";

const swrConfig: SWRConfiguration = {
  suspense: true,
};

export function useAuth() {
  const { showBoundary } = useErrorBoundary();
  const db = useDb();
  const auth = getAuth(db.app);

  return useSubscription<User | null>("firebase/auth", (set) => {
    const unsubscribe = onAuthStateChanged(auth, {
      next: (user) => set(user),
      error: (err) => showBoundary(err),
      complete: noop,
    });
    return () => unsubscribe();
  });
}

export function usePrecompiledPasswordAuth() {
  const db = useDb();
  const auth = getAuth(db.app);

  useSWR("firebase/precompiled-password-auth", fetcher, swrConfig);

  return useAuth();

  async function fetcher() {
    const params = new URLSearchParams(window.location.search);
    const email = params.get("email");
    const password = params.get("password");

    if (email && password) {
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch {
        console.warn("Failed to sign in with precompiled credentials.");
      }

      window.history.replaceState(undefined, "", window.location.pathname);
    }

    return 0;
  }
}

export function useAnonymousAuth() {
  const db = useDb();
  const auth = getAuth(db.app);
  const user = useAuth();

  const { mutate } = useSWR("firebase/anonymous-auth", () => signInAnonymously(auth), swrConfig);

  if (!user) throw mutate();
  return user;
}

export function useSignInWithPassword() {
  const db = useDb();
  const auth = getAuth(db.app);

  const [error, setError] = useState<FirebaseError>();

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      setError(undefined);
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (error) {
        setError(error as FirebaseError);
      }
    },
    [auth],
  );

  return { signInWithPassword, error };
}
