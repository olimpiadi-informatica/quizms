import { type ReactNode, useEffect, useMemo } from "react";

import { Trans } from "@lingui/react/macro";
import { Title, UiLanguageScope, UiLanguageSelect } from "@olinfo/quizms/components";
import { contestsLanguages } from "@olinfo/quizms/utils";
import {
  CurrentPasswordField,
  Form,
  Navbar,
  NavbarBrand,
  NavbarContent,
  SubmitButton,
  UsernameField,
} from "@olinfo/react-components";
import { getAuth, signInWithCustomToken, type User } from "firebase/auth";
import { useSearch } from "wouter";

import { useAuth, useCollection } from "~/web/hooks";

import { adminLogin, teacherLogin } from "./api";
import { useDb } from "./base-login";
import { contestConverter } from "./converters";
import { useWebsite } from "./website";

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
    const token =
      allowedRole === "admin" ? await adminLogin(credential) : await teacherLogin(credential);

    const auth = getAuth(db.app);
    await signInWithCustomToken(auth, token);
  };

  const auth = useAuth(allowedRole);
  if (auth) {
    return children(auth);
  }

  const Scope = allowedRole === "admin" ? AdminLanguageScope : TeacherLanguageScope;

  return (
    <Scope>
      <Navbar color="bg-base-300 text-base-content">
        <NavbarBrand>
          <div className="flex items-center h-full font-bold">
            <Title />
          </div>
        </NavbarBrand>
        <NavbarContent>
          <UiLanguageSelect />
        </NavbarContent>
      </Navbar>
      <Form defaultValue={defaultCredential} onSubmit={signIn} className="p-4 pb-8">
        <h1 className="mb-2 text-xl font-bold">
          <Trans>Log in to contest management</Trans>
        </h1>
        <UsernameField field="username" />
        <CurrentPasswordField field="password" />
        <SubmitButton>
          <Trans>Log in</Trans>
        </SubmitButton>
      </Form>
    </Scope>
  );
}

/** Languages of the contests of this website, which teachers will manage. */
function TeacherLanguageScope({ children }: { children: ReactNode }) {
  const website = useWebsite();
  const [contests] = useCollection("contests", contestConverter, {
    constraints: { id: website.contests },
  });
  const languages = useMemo(() => contestsLanguages(contests), [contests]);
  return <UiLanguageScope languages={languages}>{children}</UiLanguageScope>;
}

/** Languages of all the contests, which admins manage. */
function AdminLanguageScope({ children }: { children: ReactNode }) {
  const [contests] = useCollection("contests", contestConverter);
  const languages = useMemo(() => contestsLanguages(contests), [contests]);
  return <UiLanguageScope languages={languages}>{children}</UiLanguageScope>;
}
