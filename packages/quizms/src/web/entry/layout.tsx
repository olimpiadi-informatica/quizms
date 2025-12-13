import { type ReactNode, StrictMode, Suspense, useDeferredValue } from "react";

import { Layout, useNotifications } from "@olinfo/react-components";
import useSWR, { SWRConfig } from "swr";
import { type BaseLocationHook, Router, useLocation } from "wouter";

import { Loading } from "~/web/components";
import { BrowserCheck } from "~/web/entry/browser-check";

export function BaseLayout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const deferredLocation = useDeferredValue(location);

  const hook: BaseLocationHook = () => [deferredLocation, setLocation];

  return (
    <StrictMode>
      <Layout>
        <LayoutInner>
          <Suspense fallback={<Loading />}>
            <BrowserCheck>
              <Router hook={hook}>{children}</Router>
            </BrowserCheck>
            <DatePolyfill />
          </Suspense>
        </LayoutInner>
      </Layout>
    </StrictMode>
  );
}
BaseLayout.displayName = "BaseLayout";

function LayoutInner({ children }: { children: ReactNode }) {
  const { notifyError } = useNotifications();

  return <SWRConfig value={{ onError: notifyError }}>{children}</SWRConfig>;
}
LayoutInner.displayName = "LayoutInner";

function DatePolyfill() {
  globalThis.NativeDate ??= Date;

  const { data: timeDelta } = useSWR(
    "https://time1.olinfo.it",
    async (url) => {
      const res = await fetch(url);
      const now = globalThis.NativeDate.now();
      const timestamp = await res.text();
      return Number(timestamp) - now;
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
DatePolyfill.displayName = "DatePolyfill";

declare global {
  var NativeDate: typeof Date;
}
