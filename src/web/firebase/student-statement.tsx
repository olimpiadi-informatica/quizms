import { getDownloadURL, getStorage, ref } from "firebase/storage";

import { useStudent } from "~/web/student/provider";
import { RemoteStatement } from "~/web/student/remote-statement";

import { useDb } from "./common/base-login";

export function FirebaseStatement() {
  const db = useDb();
  const { contest, student } = useStudent();

  const storage = getStorage(db.app);

  const statementRef = ref(
    storage,
    `statements/${student.variant!}/statement-${contest.statementVersion}.js`,
  );

  return <RemoteStatement id={statementRef.fullPath} url={() => getDownloadURL(statementRef)} />;
}
