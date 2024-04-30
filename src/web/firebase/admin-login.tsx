import { ReactNode, useCallback } from "react";

import { FirebaseOptions } from "firebase/app";
import { getAuth, signOut } from "firebase/auth";

import { AdminProvider } from "~/web/admin/provider";

import { FirebaseLogin, useDb } from "./base-login";
import { contestConverter } from "./converters";
import EmailLogin from "./email-login";
import { useCollection } from "./hooks";
import SsoLogin from "./sso-login";

type Props = {
  ssoUrl?: string;
  ssoLogo?: object;
  config: FirebaseOptions;
  children: ReactNode;
};

export function AdminLogin({ ssoUrl, ssoLogo, config, children }: Props) {
  const Login = useCallback(
    function Login({ children }: { children: ReactNode }) {
      return ssoUrl ? (
        <SsoLogin url={ssoUrl} logo={ssoLogo}>
          {children}
        </SsoLogin>
      ) : (
        <EmailLogin method="email">{children}</EmailLogin>
      );
    },
    [ssoUrl, ssoLogo],
  );

  return (
    <FirebaseLogin config={config}>
      <Login>
        <AdminInner>{children}</AdminInner>
      </Login>
    </FirebaseLogin>
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
