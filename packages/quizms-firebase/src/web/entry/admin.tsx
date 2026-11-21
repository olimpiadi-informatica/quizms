import { useCallback } from "react";

import { useLingui } from "@lingui/react/macro";
import { getAuth, signOut, type User } from "firebase/auth";

import { AdminProvider } from "~/web/admin/provider";
import { useDb } from "~/web/common/base-login";
import { contestConverter, variantConverter } from "~/web/common/converters";
import TokenLogin from "~/web/common/token-login";
import { useCollection } from "~/web/hooks";

export default function AdminEntry() {
  return <TokenLogin allowedRole="admin">{(auth) => <AdminInner user={auth.user} />}</TokenLogin>;
}

function AdminInner({ user }: { user: User }) {
  const { t } = useLingui();
  const db = useDb();
  const name = user.displayName ?? t`Anonymous user`;

  const [contests] = useCollection("contests", contestConverter);

  const [variants] = useCollection("variants", variantConverter);

  const logout = useCallback(async () => {
    await signOut(getAuth(db.app));
    window.location.reload();
  }, [db]);

  return (
    <AdminProvider
      user={user}
      name={name}
      contests={contests}
      logout={logout}
      variants={variants}
    />
  );
}
