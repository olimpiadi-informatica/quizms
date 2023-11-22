import React, { ReactNode, useCallback, useRef, useState } from "react";

import classNames from "classnames";
import { User, getAuth, signOut } from "firebase/auth";
import { RotateCw, UserIcon } from "lucide-react";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";
import { useSignInWithEmailAndPassword } from "react-firebase-hooks/auth";

import { useDb } from "~/firebase/login";
import Modal from "~/ui/components/modal";
import Prose from "~/ui/components/prose";

export default function TeacherLogin({ children }: { children: ReactNode }) {
  const db = useDb();
  const auth = getAuth(db.app);

  const [signInWithEmailAndPassword, user, loading, error] = useSignInWithEmailAndPassword(auth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const signIn = () => signInWithEmailAndPassword(email, password);

  if (auth.currentUser) {
    return (
      <div>
        <Navbar user={auth.currentUser} />
        <ErrorBoundary FallbackComponent={ErrorView}>
          <VerifiedUserWrapper user={auth.currentUser}>{children}</VerifiedUserWrapper>
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <div className="my-8 flex justify-center">
      <main className="max-w-md grow p-4">
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text text-lg">Email</span>
          </label>
          <input
            type="email"
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
            placeholder="Insersci la password"
            className="input input-bordered w-full max-w-md"
            onChange={(e) => setPassword(e.target.value)}
            value={password}
          />
        </div>
        <span className="pt-1 text-red-600">{error?.message ?? <>&nbsp;</>}</span>
        <div className="flex justify-center pt-3">
          <button className="btn btn-success" onClick={signIn}>
            <span className={classNames("loading loading-spinner", !loading && "hidden")}></span>
            Accedi
          </button>
        </div>
      </main>
    </div>
  );
}

function Navbar({ user }: { user: User }) {
  const db = useDb();

  const modalRef = useRef<HTMLDialogElement>(null);

  const logOut = useCallback(async () => {
    await signOut(getAuth(db.app));
    window.location.reload();
  }, [db]);

  return (
    <div className="sticky top-0 z-50 mb-4 flex items-center justify-end gap-3 border-b border-base-content bg-base-100 p-3">
      <button className="btn btn-ghost no-animation" onClick={() => modalRef.current?.showModal()}>
        <UserIcon />
        <span className="uppercase">{user.displayName || "Utente anonimo"}</span>
      </button>
      <Modal title="Vuoi cambiare utente?" ref={modalRef}>
        <div className="text-md mt-5 flex flex-row justify-center">
          <button className="btn btn-error" onClick={logOut}>
            Cambia utente
          </button>
        </div>
      </Modal>
    </div>
  );
}

function VerifiedUserWrapper({ user, children }: { user: User; children: ReactNode }) {
  if (!user.emailVerified) {
    throw new Error("Utente non autorizzato");
  }
  return children;
}

function ErrorView({ error }: FallbackProps) {
  return (
    <div className="m-auto my-64 w-64">
      <p className="text-red-500">{error.message}</p>
    </div>
  );
}
