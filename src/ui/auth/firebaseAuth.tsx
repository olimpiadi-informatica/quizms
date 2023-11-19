import React, { ComponentType, ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { FirebaseOptions } from "firebase/app";
import { getAuth, signOut } from "firebase/auth";
import { collection, doc } from "firebase/firestore";
import { UserIcon } from "lucide-react";
import { useDocumentData } from "react-firebase-hooks/firestore";

import FirebaseLogin, { useDb, useUser } from "~/firebase/login";
import { decode } from "~/firebase/statement-decode";
import { passwordConverter, statementConverter } from "~/firebase/types/statement";
import { AuthenticationProvider } from "~/ui/auth/provider";
import Modal from "~/ui/components/modal";
import Progress from "~/ui/components/progress";
import Prose from "~/ui/components/prose";

type Props = {
  header: ComponentType<Record<any, never>>;
  config: FirebaseOptions;
  children: ReactNode;
};

export function FirebaseAuth({ config, header: Header, children }: Props) {
  return (
    <FirebaseLogin config={config}>
      <Prose>
        <AuthBar />
        <Header />
        <AuthInner>{children}</AuthInner>
      </Prose>
    </FirebaseLogin>
  );
}

function AuthBar() {
  const db = useDb();
  const user = useUser();

  const modalRef = useRef<HTMLDialogElement>(null);

  const logOut = useCallback(async () => {
    await signOut(getAuth(db.app));
    window.location.reload();
  }, [db]);

  return (
    <div className="sticky top-0 z-50 mb-4 flex items-center justify-end gap-3 border-b border-base-content bg-base-100 p-3">
      <button className="btn btn-ghost no-animation" onClick={() => modalRef.current?.showModal()}>
        <UserIcon />
        <span className="uppercase">{user.name}</span>
      </button>
      <Modal title="Vuoi cambiare utente?" ref={modalRef}>
        <div className="text-md flex flex-row justify-center gap-5">
          <button className="btn btn-error" onClick={logOut}>
            Cambia utente
          </button>
        </div>
      </Modal>
    </div>
  );
}

function AuthInner({ children }: { children: ReactNode }) {
  const db = useDb();
  const user = useUser();
  const contestRef = collection(db, "users", user.token, "contest");

  const [statement, , statementError] = useDocumentData(
    doc(contestRef, "statement").withConverter(statementConverter),
  );
  const [password, , passwordError] = useDocumentData(
    doc(contestRef, "password").withConverter(passwordConverter),
  );

  const [Contest, setContest] = useState<ComponentType>();

  const [contestError, setContestError] = useState<Error>();
  useEffect(() => {
    if (!statement || !password) return;
    decode(statement, password)
      .then((contest) => setContest(() => contest))
      .catch((error) => setContestError(error));
  }, [statement, password]);

  if (Contest) return <Contest />;

  const error = passwordError ?? statementError ?? contestError;
  if (error) {
    return (
      <div className="m-auto my-64 w-64">
        <div>Errore: {error.toString()}</div>
      </div>
    );
  }

  return (
    <div className="m-auto my-64 w-64">
      <Progress>Caricamento in corso...</Progress>
    </div>
  );
}
