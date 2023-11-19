import React, { ComponentType, ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import { FirebaseOptions, initializeApp } from "firebase/app";
import {
  Firestore,
  collection,
  doc,
  getDoc,
  initializeFirestore,
  persistentLocalCache,
} from "firebase/firestore";
import { useDocumentData } from "react-firebase-hooks/firestore";

import { decode } from "~/firebase/statement-decode";
import { User, passwordConverter, statementConverter, userConverter } from "~/firebase/types";
import Progress from "~/ui/components/progress";
import Prose from "~/ui/components/prose";

type Props = {
  header: ComponentType<Record<any, never>>;
  config: FirebaseOptions;
  children: ReactNode;
};

export function FirebaseAuth({ config, header: Header, ...rest }: Props) {
  const [token, setToken] = useState<string>("");
  const [user, setUser] = useState<User>();
  const [error, setError] = useState<string>();

  const disabled = useMemo(() => !/^[a-z-]+$/.test(token), [token]);

  const db = useMemo(() => {
    const app = initializeApp(config);
    return initializeFirestore(app, { localCache: persistentLocalCache() });
  }, [config]);

  const enter = useCallback(async () => {
    try {
      const user = await getDoc(doc(db, "users", token).withConverter(userConverter));

      if (user.exists()) {
        setUser(user.data());
      } else {
        setError("Token non valido.");
      }
    } catch (e: any) {
      setError(e.toString());
    }
  }, [db, token]);

  if (user) {
    return (
      <Prose>
        <Header />
        <AuthInner db={db} user={user} />
      </Prose>
    );
  }

  return (
    <div className="my-8 flex justify-center">
      <main className="max-w-md grow p-4">
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text text-lg">Inserisci il token</span>
          </label>
          <input
            type="text"
            placeholder="nome-cognome-xxxx-xxx"
            className="input input-bordered w-full max-w-md"
            onChange={(e) => setToken(e.target.value)}
            value={token}
          />
          <span className="pt-1 text-red-600">{error ?? <>&nbsp;</>}</span>
        </div>
        <div className="flex justify-center pt-3">
          <button className="btn btn-success" disabled={disabled} onClick={enter}>
            Entra
          </button>
        </div>
      </main>
    </div>
  );
}

function AuthInner({ db, user }: { db: Firestore; user: User }) {
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
