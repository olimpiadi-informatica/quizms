import { type ReactNode, useCallback } from "react";

// @ts-expect-error
import { createFromFetch } from "react-server-dom-webpack/client";
import useSWR from "swr/immutable";

import { BaseStatement } from "./base-statement";
import { useStudent } from "./context";

type ReactPromise<T> = PromiseLike<T> & {
  status?: "fulfilled" | "rejected";
  value?: T;
  reason?: any;
};

const moduleCache = new Map<string, ReactPromise<any>>();

type ModuleLoader = ((id: string) => ReactPromise<any>) & { u: any };

type Props = {
  statementUrl: () => Promise<string> | string;
  stylesheetUrl?: () => Promise<string> | string;
  moduleUrl: (id: string) => Promise<string> | string;
};

export function RemoteStatement({ statementUrl, stylesheetUrl, moduleUrl }: Props) {
  const loader: ModuleLoader = (id: string) => {
    const cachedModule = moduleCache.get(id);
    if (cachedModule) {
      return cachedModule;
    }

    const promise = Promise.resolve(moduleUrl(id)).then(
      (url) => import(/* @vite-ignore */ url),
    ) as ReactPromise<any>;
    promise.then(
      (value) => {
        promise.status = "fulfilled";
        promise.value = value;
      },
      (reason) => {
        promise.status = "rejected";
        promise.reason = reason;
      },
    );

    moduleCache.set(id, promise);
    return promise;
  };
  loader.u = globalThis.__webpack_require__;
  globalThis.__webpack_require__ = loader;

  return (
    <BaseStatement>
      <InnerStatement statementUrl={statementUrl} />
      {stylesheetUrl && <StatementStylesheet stylesheetUrl={stylesheetUrl} />}
    </BaseStatement>
  );
}

function StatementStylesheet({ stylesheetUrl }: { stylesheetUrl: () => Promise<string> | string }) {
  const { student } = useStudent();
  const { data } = useSWR(
    `statement/${student.contestId}/${student.variant}/stylesheet`,
    stylesheetUrl,
    { suspense: true },
  );
  return <link rel="stylesheet" href={data} />;
}

function InnerStatement({ statementUrl }: Pick<Props, "statementUrl">) {
  const { student } = useStudent();

  const fetcher = useCallback(() => {
    const modulesMap = new Proxy(
      {},
      {
        get: (_, moduleId) => {
          return {
            "*": {
              id: moduleId,
              chunks: [],
              name: "*",
            },
          };
        },
      },
    );

    return createFromFetch(
      Promise.resolve(statementUrl()).then((url) => fetch(url)),
      { serverConsumerManifest: { modulesMap } },
    ) as Promise<ReactNode>;
  }, [statementUrl]);

  const { data } = useSWR(`statement/${student.contestId}/${student.variant}/statement`, fetcher, {
    suspense: true,
  });
  return data;
}

declare global {
  var __webpack_require__: ModuleLoader;
}
