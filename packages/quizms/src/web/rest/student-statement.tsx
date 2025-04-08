import { ReactNode, useCallback } from "react";
import { RemoteStatement } from "../student/remote-statement";
import { useRest } from "./common/api";
import urlJoin from "url-join";

type Props = {
  createFromFetch: (res: Promise<Response>) => ReactNode;
  statementVersion: string;
};

export function RestStatement({ createFromFetch, statementVersion }: Props) {
  const { apiUrl } = useRest()!;
  const fetcher = useCallback(async () => {
    return createFromFetch(fetch(urlJoin(apiUrl, "/contestant/statement"), { credentials: "include" }));
  }, [createFromFetch]);

  return <RemoteStatement id={statementVersion} fetcher={fetcher} />;
}
