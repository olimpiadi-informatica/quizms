import {
  User,
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCustomToken,
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

export function useTokenAuth() {
  const db = useDb();
  const auth = getAuth(db.app);

  useSWR("firebase/token-auth", fetcher, swrConfig);

  return useAuth();

  async function fetcher() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      try {
        await signInWithCustomToken(auth, token);
      } catch (e) {
        console.warn(`Failed to sign in with token: ${(e as Error).message}`);
      }

      window.history.replaceState(undefined, "", window.location.pathname);
    }

    return 0;
  }
}

export function usePrecompiledPasswordAuth() {
  const db = useDb();
  const auth = getAuth(db.app);

  useSWR("firebase/precompiled-password-auth", fetcher, swrConfig);

  return useAuth();

  async function fetcher() {
    const params = new URLSearchParams(window.location.search);
    const email = params.get("email") || params.get("e");
    const username = params.get("username") || params.get("user") || params.get("u");
    const password = params.get("password") || params.get("pswd") || params.get("p");

    if ((email || username) && password) {
      try {
        await signInWithEmailAndPassword(auth, email || `${username}@teacher.edu`, password);
      } catch (e) {
        console.warn(`Failed to sign in with precompiled credentials: ${(e as Error).message}`);
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
