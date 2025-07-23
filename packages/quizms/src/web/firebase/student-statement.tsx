import { useCallback } from "react";

import { getDownloadURL, getStorage, ref } from "firebase/storage";

import { useStudent } from "~/web/student/context";
import { RemoteStatement } from "~/web/student/remote-statement";

import { useDb } from "./common/base-login";

export function FirebaseStatement() {
  const db = useDb();
  const { student } = useStudent();

  const storage = getStorage(db.app);

  const getFileUrl = useCallback(
    (fileName: string) => {
      const statementRef = ref(
        storage,
        `statements/${student.contestId}/${student.variant}/${fileName}`,
      );
      return getDownloadURL(statementRef);
    },
    [storage, student],
  );

  return (
    <RemoteStatement
      statementUrl={() => getFileUrl("statement.txt")}
      stylesheetUrl={() => getFileUrl("statement.css")}
      moduleUrl={getFileUrl}
    />
  );
}
