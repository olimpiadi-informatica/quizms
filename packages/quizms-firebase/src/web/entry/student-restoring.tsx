import { type ReactNode, useEffect } from "react";

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
          Il tuo account è già presente su un&apos;altro dispositivo. Per trasferire l&apos;accesso
          al dispositivo corrente comunica al tuo insegnante di inserire il codice seguente in fondo
          alla pagina di gestione gara, sezione &quot;richieste di accesso&quot;:
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
            Esci <LogOut size={20} />
          </button>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}
