import { getAuth, onAuthStateChanged, signInAnonymously, type User } from "firebase/auth";
import { noop } from "lodash-es";
import { useErrorBoundary } from "react-error-boundary";
import type { SWRConfiguration } from "swr";
import useSWR from "swr/immutable";

import { useDb } from "~/web/firebase/common/base-login";

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

export function useAnonymousAuth() {
  const db = useDb();
  const auth = getAuth(db.app);
  const user = useAuth();

  const { mutate } = useSWR("firebase/anonymous-auth", () => signInAnonymously(auth), swrConfig);

  if (!user) throw mutate();
  return user;
}
