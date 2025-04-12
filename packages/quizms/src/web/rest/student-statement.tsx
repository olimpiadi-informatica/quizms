import { type ReactNode, useCallback } from "react";
import urlJoin from "url-join";
import { RemoteStatement } from "../student/remote-statement";
import { useRest } from "./common/api";

type Props = {
  createFromFetch: (res: Promise<Response>) => ReactNode;
  statementVersion: string;
};

export function RestStatement({ createFromFetch, statementVersion }: Props) {
  const { apiUrl } = useRest()!;
  const fetcher = useCallback(() => {
    return createFromFetch(
      fetch(urlJoin(apiUrl, "/contestant/statement"), { credentials: "include" }),
    );
  }, [createFromFetch, apiUrl]);

  return <RemoteStatement id={statementVersion} fetcher={fetcher} />;
}
