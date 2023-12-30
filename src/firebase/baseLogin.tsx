import React, { ReactNode, Suspense, createContext, useContext, useMemo } from "react";

import { FirebaseOptions, initializeApp } from "firebase/app";
import { browserLocalPersistence, debugErrorMap, getAuth, initializeAuth } from "firebase/auth";
import { Firestore, initializeFirestore, persistentLocalCache } from "firebase/firestore";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";

import Error from "~/core/components/error";
import Loading from "~/core/components/loading";
import { useTime } from "~/core/components/time";

import { useAuth } from "./hooks";

type Props = {
  config: FirebaseOptions;
  children: ReactNode;
};

export function FirebaseLogin({ config, children }: Props) {
  const db = useMemo(() => {
    if (!config) return;

    const app = initializeApp(config);
    initializeAuth(app, {
      errorMap: debugErrorMap,
      persistence: browserLocalPersistence,
    });
    return initializeFirestore(app, { localCache: persistentLocalCache() });
  }, [config]);

  if (!config) {
    return (
      <div className="h-dvh">
        <Error error={{ message: "No Firebase configuration provided." }} />
      </div>
    );
  }

  return (
    <FirebaseContext.Provider value={db}>
      <div className="h-dvh">
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

function ErrorLogout({ error }: FallbackProps) {
  const db = useDb();
  const auth = getAuth(db.app);

  const onReset = async () => {
    await auth.signOut();
    window.location.reload();
  };

  return <Error error={error} resetErrorBoundary={onReset} />;
}
