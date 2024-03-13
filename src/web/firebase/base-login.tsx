import React, { ReactNode, Suspense, createContext, useContext, useMemo } from "react";

import { FirebaseOptions, initializeApp } from "firebase/app";
import { browserLocalPersistence, debugErrorMap, getAuth, initializeAuth } from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";

import { Error, Loading, useTime } from "~/components";

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
    return getFirestore(app);
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
            <TimeWrapper>{children}</TimeWrapper>
          </Suspense>
        </ErrorBoundary>
      </div>
    </FirebaseContext.Provider>
  );
}

function TimeWrapper({ children }: { children: ReactNode }) {
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
