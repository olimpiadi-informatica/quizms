import { createContext, type ReactNode, Suspense, use, useCallback, useMemo } from "react";

import { ErrorBoundary, Loading } from "@olinfo/quizms/components";
import { initializeApp } from "firebase/app";
import { browserSessionPersistence, debugErrorMap, getAuth, initializeAuth } from "firebase/auth";
import { type Firestore, getFirestore } from "firebase/firestore";

// @ts-expect-error
import config from "virtual:quizms-firebase-config";

type Props = {
  children: ReactNode;
};

export function FirebaseLogin({ children }: Props) {
  const db = useMemo(() => {
    const app = initializeApp(config);
    initializeAuth(app, { persistence: browserSessionPersistence, errorMap: debugErrorMap });
    return getFirestore(app);
  }, []);

  const onReset = useCallback(async () => {
    const auth = getAuth(db.app);
    await auth.signOut();
    window.location.reload();
  }, [db]);

  return (
    <FirebaseContext.Provider value={db}>
      <ErrorBoundary onReset={onReset}>
        <Suspense fallback={<Loading />}>{children}</Suspense>
      </ErrorBoundary>
    </FirebaseContext.Provider>
  );
}

const FirebaseContext = createContext<Firestore | undefined>(undefined);
FirebaseContext.displayName = "FirebaseContext";

export function useDb() {
  return use(FirebaseContext)!;
}
