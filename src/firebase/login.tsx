import React, { ReactNode, Suspense, createContext, useContext, useMemo } from "react";

import { FirebaseOptions, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  debugErrorMap,
  getAuth,
  initializeAuth,
  onAuthStateChanged,
} from "firebase/auth";
import { Firestore, initializeFirestore, persistentLocalCache } from "firebase/firestore";
import { RotateCw } from "lucide-react";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";

import Progress from "~/ui/components/progress";
import Prose from "~/ui/components/prose";
import useSuspense from "~/ui/components/suspense";

type Props = {
  config: FirebaseOptions;
  children: ReactNode;
};

export function FirebaseLogin({ config, children }: Props) {
  const db = useMemo(() => {
    const app = initializeApp(config);
    initializeAuth(app, {
      errorMap: debugErrorMap,
      persistence: browserLocalPersistence,
    });
    return initializeFirestore(app, { localCache: persistentLocalCache() });
  }, [config]);

  return (
    <Prose>
      <FirebaseContext.Provider value={db}>
        <ErrorBoundary FallbackComponent={Error}>
          <Suspense fallback={<Loading />}>
            <AuthWrapper db={db}>{children}</AuthWrapper>
          </Suspense>
        </ErrorBoundary>
      </FirebaseContext.Provider>
    </Prose>
  );
}

function AuthWrapper({ db, children }: { db: Firestore; children: ReactNode }) {
  useSuspense(function waitForAuth() {
    return new Promise<void>((resolve) => {
      const auth = getAuth(db.app);
      const unsub = onAuthStateChanged(auth, () => {
        resolve();
        unsub();
      });
    });
  });

  return children;
}

function Loading() {
  return (
    <div className="m-auto my-64 w-64">
      <Progress>Caricamento in corso...</Progress>
    </div>
  );
}

function Error({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="m-auto my-64 w-64">
      <p className="text-red-500">{error.message}</p>
      <div className="text-md mt-5 flex flex-row justify-center">
        <button className="btn btn-error" onClick={resetErrorBoundary}>
          <RotateCw />
          Ricarica
        </button>
      </div>
    </div>
  );
}

const FirebaseContext = createContext<Firestore | undefined>(undefined);
FirebaseContext.displayName = "FirebaseContext";

export function useDb() {
  return useContext(FirebaseContext)!;
}
