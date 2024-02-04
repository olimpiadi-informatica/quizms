import React, { ReactNode, useCallback, useState } from "react";

import { FirebaseOptions } from "firebase/app";
import { getAuth, signOut } from "firebase/auth";

import { Button } from "~/components";
import { AdminProvider } from "~/web/admin/provider";
import { FirebaseLogin, useDb } from "~/web/firebase/base-login";
import { contestConverter } from "~/web/firebase/converters";
import {
  useCollection,
  usePrecompiledPasswordAuth,
  useSignInWithPassword,
} from "~/web/firebase/hooks";

export function AdminLogin({ config, children }: { config: FirebaseOptions; children: ReactNode }) {
  return (
    <FirebaseLogin config={config}>
      <AdminLoginInner>{children}</AdminLoginInner>
    </FirebaseLogin>
  );
}

function AdminLoginInner({ children }: { children: ReactNode }) {
  const { signInWithPassword, error } = useSignInWithPassword();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const signIn = () => signInWithPassword(email, password);

  const user = usePrecompiledPasswordAuth();

  if (user?.emailVerified) {
    return <AdminInner>{children}</AdminInner>;
  }

  return (
    <div className="my-8 flex justify-center">
      <form className="max-w-md grow p-4">
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text text-lg">Email</span>
          </label>
          <input
            type="text"
            autoComplete="email"
            placeholder="Inserisci l'email"
            className="input input-bordered w-full max-w-md"
            onChange={(e) => setEmail(e.target.value)}
            value={email}
          />
        </div>
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text text-lg">Password</span>
          </label>
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Insersci la password"
            className="input input-bordered w-full max-w-md"
            onChange={(e) => setPassword(e.target.value)}
            value={password}
          />
        </div>
        <span className="pt-1 text-error">{error?.message ?? <>&nbsp;</>}</span>
        <div className="flex justify-center pt-3">
          <Button className="btn-success" onClick={signIn}>
            Accedi
          </Button>
        </div>
      </form>
    </div>
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
