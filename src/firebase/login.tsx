import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import classNames from "classnames";
import { FirebaseOptions, initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
  Firestore,
  doc,
  getDoc,
  initializeFirestore,
  persistentLocalCache,
  setDoc,
} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";

import { tokenConverter } from "~/firebase/types/token";
import { User, userConverter } from "~/firebase/types/user";
import Progress from "~/ui/components/progress";
import Prose from "~/ui/components/prose";

type FirebaseUserProps = {
  db: Firestore;
  user: User;
};

const FirebaseUserContext = createContext<FirebaseUserProps | undefined>(undefined);
FirebaseUserContext.displayName = "FirebaseUserContext";

type Props = {
  config: FirebaseOptions;
  children: ReactNode;
};

export default function FirebaseLogin({ config, children }: Props) {
  const [uid, setUid] = useState<string>();

  const [token, setToken] = useState("");
  const [user, setUser] = useState<User>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  const db = useMemo(() => {
    const app = initializeApp(config);
    return initializeFirestore(app, { localCache: persistentLocalCache() });
  }, [config]);

  const getToken = useCallback(async () => {
    try {
      const auth = getAuth(db.app);
      const credential = await signInAnonymously(auth);
      const uid = credential.user.uid;
      setUid(uid);

      const token = await getDoc(doc(db, "tokens", uid).withConverter(tokenConverter));
      if (token.exists()) {
        const user = await getDoc(doc(db, "users", token.data()).withConverter(userConverter));
        if (user.exists()) {
          setUser(user.data());
          setToken(token.data());
        }
      }
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => void getToken(), []);

  const disabled = useMemo(() => !/^[a-z-]+$/.test(token), [token]);
  const [loginLoading, setLoginLoading] = useState(false);

  const enter = useCallback(async () => {
    try {
      setLoginLoading(true);

      const user = await getDoc(doc(db, "users", token).withConverter(userConverter));

      if (user.exists()) {
        await setDoc(doc(db, "tokens", uid!).withConverter(tokenConverter), token);
        setUser(user.data());
      } else {
        setError("Token non valido.");
      }
    } catch (e: any) {
      console.log("Error", e);
      setError(e.toString());
    } finally {
      setLoginLoading(false);
    }
  }, [db, token]);

  if (error) {
    return (
      <Prose>
        <div className="m-auto my-64 w-64">
          <Progress>Errore: {error}.</Progress>
        </div>
      </Prose>
    );
  }

  if (loading) {
    return (
      <Prose>
        <div className="m-auto my-64 w-64">
          <Progress>Caricamento in corso...</Progress>
        </div>
      </Prose>
    );
  }

  if (user) {
    return (
      <FirebaseUserContext.Provider value={{ db, user }}>{children}</FirebaseUserContext.Provider>
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
            <span
              className={classNames("loading loading-spinner", !loginLoading && "hidden")}></span>
            Entra
          </button>
        </div>
      </main>
    </div>
  );
}

export function useDb() {
  const { db } = useContext(FirebaseUserContext)!;
  return db;
}

export function useUser(): User {
  const { user } = useContext(FirebaseUserContext)!;
  return user;
}
