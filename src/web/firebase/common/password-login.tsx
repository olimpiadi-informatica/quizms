import { type ReactNode, useEffect } from "react";

import {
  CurrentPasswordField,
  Form,
  Navbar,
  SubmitButton,
  UsernameField,
} from "@olinfo/react-components";
import { FirebaseError } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { useSearch } from "wouter";

import { useAuth } from "~/web/firebase/hooks";

import { useDb } from "./base-login";

type Props = {
  children: ReactNode;
};

export default function PasswordLogin({ children }: Props) {
  const db = useDb();
  const params = new URLSearchParams(useSearch());

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("username");
    url.searchParams.delete("password");
    window.history.replaceState(undefined, "", url.href);
  }, []);

  const defaultCredential = {
    username: params.get("username") ?? "",
    password: params.get("password") ?? "",
  };

  const signIn = async (credential: { username: string; password: string }) => {
    const auth = getAuth(db.app);
    try {
      await signInWithEmailAndPassword(
        auth,
        `${credential.username}@teacher.edu`,
        credential.password,
      );
    } catch (err) {
      if (!(err instanceof FirebaseError)) throw err;
      switch (err.code) {
        case "auth/invalid-email":
        case "auth/user-not-found":
          throw new Error("Username non corretto.");
        case "auth/wrong-password":
          throw new Error("Password non corretta.");
        case "auth/too-many-requests":
          throw new Error("Troppi tentativi, aspetta 5 minuti e poi riprova.");
        default:
          throw new Error(err.message.replace(/^Firebase: /, "").replace(/ \([/a-z-]+\)\.$/, ""));
      }
    }
  };

  const user = useAuth();

  if (user?.emailVerified) {
    return children;
  }

  return (
    <>
      <Navbar color="bg-base-300 text-base-content">
        <div className="btn btn-ghost no-animation cursor-auto">Olimpiadi di Informatica</div>
      </Navbar>
      <Form defaultValue={defaultCredential} onSubmit={signIn} className="p-4 pb-8">
        <h1 className="mb-2 text-xl font-bold">Accedi alla gestione gara</h1>
        <UsernameField field="username" />
        <CurrentPasswordField field="password" />
        <SubmitButton>Accedi</SubmitButton>
      </Form>
    </>
  );
}
