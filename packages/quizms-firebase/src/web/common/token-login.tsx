import { type ReactNode, useEffect } from "react";

import { Title } from "@olinfo/quizms/components";
import {
  CurrentPasswordField,
  Form,
  Navbar,
  NavbarBrand,
  SubmitButton,
  UsernameField,
} from "@olinfo/react-components";
import { getAuth, signInWithCustomToken, type User } from "firebase/auth";
import { useSearch } from "wouter";

import { useAuth } from "~/web/hooks";

import { login } from "./api";
import { useDb } from "./base-login";

type Props = {
  allowedRole: "teacher" | "admin";
  children: (auth: { user: User; claims: Record<string, string> }) => ReactNode;
};

export default function TokenLogin({ allowedRole, children }: Props) {
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
    const { token } = await login(db, allowedRole, credential);

    const auth = getAuth(db.app);
    await signInWithCustomToken(auth, token);
  };

  const auth = useAuth(allowedRole);
  if (auth) {
    return children(auth);
  }

  return (
    <>
      <Navbar color="bg-base-300 text-base-content">
        <NavbarBrand>
          <div className="flex items-center h-full font-bold">
            <Title />
          </div>
        </NavbarBrand>
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
