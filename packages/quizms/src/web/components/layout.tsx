import { type ReactNode, Suspense, useDeferredValue } from "react";

import { Layout, useNotifications } from "@olinfo/react-components";
import useSWR, { SWRConfig } from "swr";
import { type BaseLocationHook, Router, Switch, useLocation } from "wouter";

import { Loading } from "~/web/components";

import "./index.css";

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

  const { data: timeDelta } = useSWR(
    "/api/contestant/time", // TODO: do not assume /api path
    async (url) => {
      const res = await fetch(url);
      const now = globalThis.NativeDate.now();
      try {
        const isoDate = await res.json();
        const date = new Date(isoDate);
        return date.getTime() - now;
      } catch {
        return 0;
      }
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
