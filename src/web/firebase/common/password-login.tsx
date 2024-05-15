import { ReactNode, useEffect } from "react";

import {
  CurrentPasswordField,
  Form,
  Navbar,
  SubmitButton,
  UsernameField,
} from "@olinfo/react-components";
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
    await signInWithEmailAndPassword(
      auth,
      `${credential.username}@teacher.edu`,
      credential.password,
    );
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
