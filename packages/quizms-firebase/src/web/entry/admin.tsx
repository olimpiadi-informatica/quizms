import { useCallback } from "react";

import { getAuth, signOut, type User } from "firebase/auth";

import { AdminProvider } from "~/web/admin/provider";
import { useDb } from "~/web/common/base-login";
import { contestConverter } from "~/web/common/converters";
import TokenLogin from "~/web/common/token-login";
import { useCollection } from "~/web/hooks";

export default function AdminEntry() {
  return <TokenLogin allowedRole="admin">{(auth) => <AdminInner user={auth.user} />}</TokenLogin>;
}

function AdminInner({ user }: { user: User }) {
  const db = useDb();
  const name = user.displayName ?? "Utente anonimo";

  const [contests, setContest] = useCollection("contests", contestConverter);

  const logout = useCallback(async () => {
    await signOut(getAuth(db.app));
    window.location.reload();
  }, [db]);

  return <AdminProvider name={name} contests={contests} setContest={setContest} logout={logout} />;
}
