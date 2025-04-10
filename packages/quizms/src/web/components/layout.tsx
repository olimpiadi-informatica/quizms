import { type ReactNode, Suspense, useDeferredValue } from "react";

import { Layout, useNotifications } from "@olinfo/react-components";
import useSWR, { SWRConfig } from "swr";
import { type BaseLocationHook, Router, Switch, useLocation } from "wouter";

import { Loading } from "~/web/components";

import "./index.css";
import urlJoin from "url-join";
import { useRest } from "../rest/common/api";

export function BaseLayout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const deferredLocation = useDeferredValue(location);

  const hook: BaseLocationHook = () => [deferredLocation, setLocation];

  return (
    <Layout>
      <LayoutInner>
        <Suspense fallback={<Loading />}>
          <Router hook={hook}>
            <Switch>{children}</Switch>
          </Router>
          <DatePolyfill />
        </Suspense>
      </LayoutInner>
    </Layout>
  );
}

function LayoutInner({ children }: { children: ReactNode }) {
  const { notifyError } = useNotifications();

  return <SWRConfig value={{ onError: notifyError }}>{children}</SWRConfig>;
}

function DatePolyfill() {
  globalThis.NativeDate ??= Date;

  const { apiUrl } = useRest()!; // TODO: make this work with firebase

  const { data: timeDelta } = useSWR(
    urlJoin(apiUrl, "contestant/time"),
    async (url) => {
      const res = await fetch(url);
      const now = globalThis.NativeDate.now();
      const isoDate = await res.text();
      return new Date(isoDate).getTime() - now;
    },
    {
      revalidateIfStale: false,
      revalidateOnMount: true,
      suspense: true,
    },
  );

  class PreciseDate extends globalThis.NativeDate {
    constructor(...args: any[]) {
      super(...((args.length === 0 ? [PreciseDate.now()] : args) as []));
    }

    static now() {
      return globalThis.NativeDate.now() + timeDelta;
    }
  }

  globalThis.Date = PreciseDate as any;

  return null;
}

declare global {
  var NativeDate: typeof Date;
}
