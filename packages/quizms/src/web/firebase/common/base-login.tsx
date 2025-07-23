import { createContext, type ReactNode, Suspense, useCallback, useContext, useMemo } from "react";

import { type FirebaseOptions, initializeApp } from "firebase/app";
import { browserLocalPersistence, debugErrorMap, getAuth, initializeAuth } from "firebase/auth";
import { type Firestore, getFirestore } from "firebase/firestore";

import { ErrorBoundary, Loading } from "~/web/components";

type Props = {
  config: FirebaseOptions;
  children: ReactNode;
};

export function FirebaseLogin({ config, children }: Props) {
  if (!config) {
    throw new Error("No Firebase configuration provided.");
  }

  const db = useMemo(() => {
    const app = initializeApp(config);
    initializeAuth(app, {
      errorMap: debugErrorMap,
      persistence: browserLocalPersistence,
    });
    return getFirestore(app);
  }, [config]);

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
  return useContext(FirebaseContext)!;
}
