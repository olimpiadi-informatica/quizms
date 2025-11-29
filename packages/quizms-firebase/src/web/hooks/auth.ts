import { getAuth, onAuthStateChanged, type User } from "firebase/auth";
import { noop } from "lodash-es";
import { useErrorBoundary } from "react-error-boundary";
import useSWR from "swr";

import { useDb } from "~/web/common/base-login";

import { useSubscription } from "./subscription";

export function useAuth(expectedRole: string) {
  const { showBoundary } = useErrorBoundary();
  const db = useDb();
  const auth = getAuth(db.app);

  const user = useSubscription<User | null>("firebase/auth", (set) => {
    const unsubscribe = onAuthStateChanged(auth, {
      next: (user) => set(user),
      error: (err) => showBoundary(err),
      complete: noop,
    });
    return () => unsubscribe();
  });

  const { data: claims } = useSWR(`firebase/auth/role/${user?.uid}`, () => getClaims(user), {
    suspense: true,
  });

  if (!user || !claims || expectedRole !== claims.role) return null;
  return { user, claims };
}

async function getClaims(user: User | null) {
  if (!user) return;

  const idToken = await user.getIdTokenResult();
  return idToken.claims as Record<string, string>;
}
