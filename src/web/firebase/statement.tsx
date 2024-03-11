import React from "react";

import { getDownloadURL, getStorage, ref } from "firebase/storage";

import { RemoteStatement, useStudent } from "~/web/student";

import { useDb } from "./base-login";

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
