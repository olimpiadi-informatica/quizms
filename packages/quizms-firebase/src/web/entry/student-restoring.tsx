import { type ReactNode, useEffect } from "react";

import { Trans } from "@lingui/react/macro";
import { Loading, Title } from "@olinfo/quizms/components";
import {
  Dropdown,
  DropdownButton,
  DropdownItem,
  DropdownMenu,
  Navbar,
  NavbarBrand,
  NavbarContent,
} from "@olinfo/react-components";
import { getAuth, signOut, type User } from "firebase/auth";
import { LogOut } from "lucide-react";

import { useDb } from "~/web/common/base-login";
import { studentRestoreConvert } from "~/web/common/converters";
import { useDocumentOptional } from "~/web/hooks";

export function StudentRestoring({ user, children }: { user: User; children: ReactNode }) {
  const db = useDb();

  const [studentRestore] = useDocumentOptional("studentRestores", user.uid, studentRestoreConvert);

  useEffect(() => {
    if (studentRestore?.status === "revoked") {
      void signOut(getAuth(db.app)).then(() => window.location.reload());
    }
  }, [db, studentRestore]);

  if (!studentRestore || studentRestore.status === "approved") {
    return children;
  }

  if (studentRestore.status === "revoked") {
    return <Loading />;
  }

  return (
    <>
      <Navbar color="bg-base-300 text-base-content">
        <NavbarBrand>
          <div className="flex items-center h-full font-bold">
            <Title />
          </div>
        </NavbarBrand>
        <NavbarContent>
          <UserDropdown name={`${studentRestore.name} ${studentRestore.surname}`} />
        </NavbarContent>
      </Navbar>
      <div className="flex flex-col justify-center items-center grow text-center m-4">
        <p className="text-lg max-w-3xl">
          <Trans>
            Your account is already in use on another device. To move the access to this device, ask
            your teacher to enter the following code at the bottom of the contest management page,
            in the &quot;access requests&quot; section:
          </Trans>
        </p>
        <div className="flex justify-center pt-3">
          <span className="pt-1 font-mono text-3xl">
            {String(studentRestore?.approvalCode).padStart(3, "0")}
          </span>
        </div>
      </div>
    </>
  );
}

function UserDropdown({ name }: { name: ReactNode }) {
  const db = useDb();

  const logout = async () => {
    await signOut(getAuth(db.app));
    window.location.reload();
  };

  return (
    <Dropdown className="dropdown-end">
      <DropdownButton>
        <div className="truncate uppercase">{name}</div>
      </DropdownButton>
      <DropdownMenu>
        <DropdownItem>
          <button type="button" className="flex justify-between gap-4" onClick={logout}>
            <Trans>Log out</Trans> <LogOut size={20} />
          </button>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}
