import React, { ReactNode, Suspense, createContext, useContext, useMemo } from "react";

import { FirebaseOptions, initializeApp } from "firebase/app";
import { browserLocalPersistence, debugErrorMap, initializeAuth } from "firebase/auth";
import { Firestore, initializeFirestore, persistentLocalCache } from "firebase/firestore";
import { RotateCw } from "lucide-react";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";

import { useAuth } from "~/firebase/hooks";
import Loading from "~/ui/components/loading";
import Progress from "~/ui/components/progress";

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
      <ErrorBoundary FallbackComponent={Error}>
        <Suspense fallback={<Loading className="h-screen" />}>
          <AuthWrapper>{children}</AuthWrapper>
        </Suspense>
      </ErrorBoundary>
    </FirebaseContext.Provider>
  );
}

function AuthWrapper({ children }: { children: ReactNode }) {
  useAuth();
  return children;
}

function Error({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex h-screen items-center">
      <div className="flex grow flex-col items-center">
        <p className="text-red-500">{error.message}</p>
        <div className="text-md mt-5 flex flex-row justify-center">
          <button className="btn btn-error" onClick={resetErrorBoundary}>
            <RotateCw />
            Ricarica
          </button>
        </div>
      </div>
    </div>
  );
}

const FirebaseContext = createContext<Firestore | undefined>(undefined);
FirebaseContext.displayName = "FirebaseContext";

export function useDb() {
  return useContext(FirebaseContext)!;
}
