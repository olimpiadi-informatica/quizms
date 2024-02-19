import React, { ReactNode, useCallback } from "react";

import { FirebaseOptions } from "firebase/app";
import { getAuth, signOut } from "firebase/auth";

import { AdminProvider } from "~/web/admin/provider";

import { FirebaseLogin, useDb } from "./base-login";
import { contestConverter } from "./converters";
import EmailLogin from "./email-login";
import { useCollection } from "./hooks";

export function AdminLogin({ config, children }: { config: FirebaseOptions; children: ReactNode }) {
  return (
    <FirebaseLogin config={config}>
      <EmailLogin>
        <AdminInner>{children}</AdminInner>
      </EmailLogin>
    </FirebaseLogin>
  );
}

function AdminInner({ children }: { children: ReactNode }) {
  const db = useDb();

  const [contests, setContest] = useCollection("contests", contestConverter, {
    subscribe: true,
  });

  const logout = useCallback(async () => {
    await signOut(getAuth(db.app));
    window.location.reload();
  }, [db]);

  return (
    <AdminProvider contests={contests} setContest={setContest} logout={logout}>
      {children}
    </AdminProvider>
  );
}
