import { type ReactNode, useCallback, useState } from "react";
import useSWRImmutable from "swr/immutable";
import urlJoin from "url-join";
import { RemoteStatement } from "../student/remote-statement";
import { useRest } from "./common/api";

type Props = {
  createFromFetch: (res: Promise<Response>) => ReactNode;
  statementVersion: string;
};

export function RestStatement({ createFromFetch, statementVersion }: Props) {
  const { apiUrl } = useRest()!;
  const [outdated, setOutdated] = useState(false);
  const fetcher = useCallback(() => {
    return createFromFetch(
      fetch(urlJoin(apiUrl, "/contestant/statement", statementVersion), { credentials: "include" }),
    );
  }, [createFromFetch, apiUrl, statementVersion]);

  useSWRImmutable(
    ["/contestant/statement_is_updated/", statementVersion],
    async ([path, statementVersion]) => {
      const res = await fetch(urlJoin(apiUrl, path, statementVersion));
      if (res.status !== 200) {
        throw new Error("Failed to check statement update");
      }
    },
    {
      onSuccess: () => {
        setOutdated(true);
      },
      onError: (err) => {
        console.log(err);
      },
      onErrorRetry: (_error, _key, _config, revalidate, { retryCount }) => {
        setTimeout(() => revalidate({ retryCount }), 30000 + Math.floor(Math.random() * 5000));
      },
    },
  );

  return <RemoteStatement id={statementVersion} fetcher={fetcher} outdated={outdated} />;
}
