import { type ReactNode, useCallback } from "react";

import { getDownloadURL, getStorage, ref } from "firebase/storage";

import { useStudent } from "~/web/student/provider";
import { RemoteStatement } from "~/web/student/remote-statement";

import { useDb } from "./common/base-login";

type Props = {
  createFromFetch: (res: Promise<Response>) => ReactNode;
  statementVersion: string;
};

export function FirebaseStatement({ createFromFetch, statementVersion }: Props) {
  const db = useDb();
  const { student } = useStudent();

  const storage = getStorage(db.app);

  const statementRef = ref(
    storage,
    `statements/${student.contestId}/${student.variant!}/statement-${statementVersion}.js`,
  );

  const fetcher = useCallback(async () => {
    const url = await getDownloadURL(statementRef);
    return createFromFetch(fetch(url));
  }, [statementRef, createFromFetch]);

  return <RemoteStatement id={statementRef.fullPath} fetcher={fetcher} />;
}
