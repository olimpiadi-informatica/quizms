import { type ReactNode, useCallback } from "react";

import { getDownloadURL, getStorage, ref } from "firebase/storage";

import { useStudent } from "~/web/student/provider";
import { RemoteStatement } from "~/web/student/remote-statement";

import { useDb } from "./common/base-login";

type Props = {
  createFromFetch: (res: Promise<Response>) => ReactNode;
};

export function FirebaseStatement({ createFromFetch }: Props) {
  const db = useDb();
  const { contest, student } = useStudent();

  const storage = getStorage(db.app);

  const statementRef = ref(
    storage,
    `statements/${student.variant!}/statement-${contest.statementVersion}.js`,
  );

  const fetcher = useCallback(async () => {
    const url = await getDownloadURL(statementRef);
    return createFromFetch(fetch(url));
  }, [statementRef, createFromFetch]);

  return <RemoteStatement id={statementRef.fullPath} fetcher={fetcher} />;
}
