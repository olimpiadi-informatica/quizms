import { ReactNode, Suspense, createContext, useContext, useMemo } from "react";

import { FirebaseOptions, initializeApp } from "firebase/app";
import { browserLocalPersistence, debugErrorMap, getAuth, initializeAuth } from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";

import { Error, Loading } from "~/components";

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
    return <Error error={{ message: "No Firebase configuration provided." }} />;
  }

  return (
    <FirebaseContext.Provider value={db}>
      <ErrorBoundary FallbackComponent={ErrorLogout}>
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

function ErrorLogout({ error }: FallbackProps) {
  const db = useDb();
  const auth = getAuth(db.app);

  const onReset = async () => {
    await auth.signOut();
    window.location.reload();
  };

  return <Error error={error} resetErrorBoundary={onReset} />;
}