import { type ReactNode, useEffect } from "react";

import { useMetadata } from "@olinfo/quizms/components";
import {
  CurrentPasswordField,
  Form,
  Navbar,
  NavbarBrand,
  SubmitButton,
} from "@olinfo/react-components";
import { getAuth, signInWithCustomToken, type User } from "firebase/auth";
import { useSearch } from "wouter";

import { getUserRole, useAuth } from "~/web/hooks";

import { login } from "./api";
import { useDb } from "./base-login";

type Props = {
  allowedRole: "teacher" | "admin";
  children: (user: User) => ReactNode;
};

export default function TokenLogin({ allowedRole, children }: Props) {
  const db = useDb();
  const params = new URLSearchParams(useSearch());
  const metadata = useMetadata();

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("token");
    window.history.replaceState(undefined, "", url.href);
  }, []);

  const defaultToken = params.get("token") ?? "";

  const signIn = async (credential: { token: string }) => {
    const { token } = await login("teacher", credential);

    const auth = getAuth(db.app);
    const newUser = await signInWithCustomToken(auth, token);
    const newUserRole = await getUserRole(newUser.user);
    if (newUserRole !== allowedRole) {
      throw new Error("Permessi insufficienti");
    }
  };

  const auth = useAuth(allowedRole);
  if (auth?.user) {
    return children(auth.user);
  }

  return (
    <>
      <Navbar color="bg-base-300 text-base-content">
        <NavbarBrand>
          <div className="flex items-center h-full font-bold">{metadata.title}</div>
        </NavbarBrand>
      </Navbar>
      <Form defaultValue={{ token: defaultToken }} onSubmit={signIn} className="p-4 pb-8">
        <h1 className="mb-2 text-xl font-bold">Accedi alla gestione gara</h1>
        <CurrentPasswordField field="token" />
        <SubmitButton>Accedi</SubmitButton>
      </Form>
    </>
  );
}
