import { useCallback } from "react";

import { useLingui } from "@lingui/react/macro";
import type { FirebaseOptions } from "firebase/app";
import { getAuth, signOut } from "firebase/auth";

import { AdminProvider } from "~/web/admin/provider";

import { FirebaseLogin, useDb } from "./common/base-login";
import { contestConverter } from "./common/converters";
import PasswordLogin from "./common/password-login";
import SsoLogin from "./common/sso-login";
import { useCollection } from "./hooks";

type Props = {
  ssoUrl?: string;
  ssoLogo?: object;
  config: FirebaseOptions;
};

export function FirebaseAdmin({ ssoUrl, ssoLogo, config }: Props) {
  return (
    <FirebaseLogin config={config}>
      {ssoUrl ? (
        <SsoLogin url={ssoUrl} logo={ssoLogo}>
          <AdminInner />
        </SsoLogin>
      ) : (
        <PasswordLogin>
          <AdminInner />
        </PasswordLogin>
      )}
    </FirebaseLogin>
  );
}

function AdminInner() {
  const db = useDb();
  const auth = getAuth(db.app);
  const { t } = useLingui();
  const name = auth.currentUser?.displayName ?? t`Anonymous user`;

  const [contests, setContest] = useCollection("contests", contestConverter, {
    subscribe: true,
  });

  const logout = useCallback(async () => {
    await signOut(getAuth(db.app));
    window.location.reload();
  }, [db]);

  return <AdminProvider name={name} contests={contests} setContest={setContest} logout={logout} />;
}
