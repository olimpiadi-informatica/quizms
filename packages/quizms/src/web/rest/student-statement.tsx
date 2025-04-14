import { type ReactNode, useCallback, useEffect } from "react";
import urlJoin from "url-join";
import { RemoteStatement } from "../student/remote-statement";
import { useRest } from "./common/api";

type Props = {
  createFromFetch: (res: Promise<Response>) => ReactNode;
  statementVersion: string;
};

async function checkStatementUpdate(apiUrl: string, statementVersion: string) {
  while (true) {
    try {
      const res = await fetch(
        urlJoin(apiUrl, "/contestant/statement_is_updated", statementVersion),
      );
      if (res.status === 200) window.location.reload();
    } catch (e) {
      console.error(e);
    }
  }
}

export function RestStatement({ createFromFetch, statementVersion }: Props) {
  const { apiUrl } = useRest()!;
  const fetcher = useCallback(() => {
    return createFromFetch(
      fetch(urlJoin(apiUrl, "/contestant/statement"), { credentials: "include" }),
    );
  }, [createFromFetch, apiUrl]);

  useEffect(() => {
    checkStatementUpdate(apiUrl, statementVersion);
  }, [apiUrl, statementVersion]);

  return <RemoteStatement id={statementVersion} fetcher={fetcher} />;
}
