import React, { ReactNode, Suspense, createContext, useContext, useMemo } from "react";

import { FirebaseOptions, initializeApp } from "firebase/app";
import { browserLocalPersistence, debugErrorMap, getAuth, initializeAuth } from "firebase/auth";
import { Firestore, initializeFirestore, persistentLocalCache } from "firebase/firestore";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";

import Error from "~/ui/components/error";
import Loading from "~/ui/components/loading";
import useTime from "~/ui/components/time";

import { useAuth } from "./hooks";

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
        <ErrorBoundary FallbackComponent={ErrorLogout}>
          <Suspense fallback={<Loading />}>
            <AuthWrapper>{children}</AuthWrapper>
          </Suspense>
        </ErrorBoundary>
      </div>
    </FirebaseContext.Provider>
  );
}

function AuthWrapper({ children }: { children: ReactNode }) {
  useAuth();
  useTime();
  return children;
}

const FirebaseContext = createContext<Firestore | undefined>(undefined);
FirebaseContext.displayName = "FirebaseContext";

export function useDb() {
  return useContext(FirebaseContext)!;
}

export default function ErrorLogout({ error, resetErrorBoundary }: FallbackProps) {
  const db = useDb();
  const auth = getAuth(db.app);

  const onReset = async () => {
    await auth.signOut();
    resetErrorBoundary();
  };

  return <Error error={error} resetErrorBoundary={onReset} />;
}
