import React, { ReactNode, Suspense, createContext, useContext, useMemo } from "react";

import { FirebaseOptions, initializeApp } from "firebase/app";
import { browserLocalPersistence, debugErrorMap, initializeAuth } from "firebase/auth";
import { Firestore, initializeFirestore, persistentLocalCache } from "firebase/firestore";
import { ErrorBoundary } from "react-error-boundary";

import { useAuth } from "~/firebase/hooks";
import Error from "~/ui/components/error";
import Loading from "~/ui/components/loading";

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
    <FirebaseContext.Provider value={db}>
      <div className="h-screen">
        <ErrorBoundary FallbackComponent={Error}>
          <Suspense fallback={<Loading />}>
            <AuthWrapper>{children}</AuthWrapper>
          </Suspense>
        </ErrorBoundary>
      </div>
    </FirebaseContext.Provider>
  );
}

function AuthWrapper({ children }: { children: ReactNode }) {
  const user = useAuth();
  return children;
}

const FirebaseContext = createContext<Firestore | undefined>(undefined);
FirebaseContext.displayName = "FirebaseContext";

export function useDb() {
  return useContext(FirebaseContext)!;
}
