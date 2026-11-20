import { useCallback } from "react";

import { RemoteStatement, useStudent } from "@olinfo/quizms/student";
import { contestStatementFile } from "@olinfo/quizms/utils";
import { getDownloadURL, getStorage, ref } from "firebase/storage";

import { useDb } from "~/web/common/base-login";

export function FirebaseStatement() {
  const db = useDb();
  const { student, contest, language } = useStudent();

  const storage = getStorage(db.app);

  const getFileUrl = useCallback(
    (fileName: string) => {
      const statementRef = ref(
        storage,
        `statements/${student.contestId}/${student.variantId}/${fileName}`,
      );
      return getDownloadURL(statementRef);
    },
    [storage, student],
  );

  return (
    <RemoteStatement
      statementUrl={() => getFileUrl(contestStatementFile(contest.languages, language))}
      // TODO
      // stylesheetUrl={() => getFileUrl("statement.css")}
      moduleUrl={getFileUrl}
    />
  );
}
