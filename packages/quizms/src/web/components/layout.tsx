import { type ReactNode, Suspense, useDeferredValue, useMemo } from "react";

import { type Messages, setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { Layout, useNotifications } from "@olinfo/react-components";
import useSWR, { SWRConfig } from "swr";
import { type BaseLocationHook, Router, Switch, useLocation } from "wouter";

import { Loading } from "~/web/components";

import "./index.css";

import { mapKeys } from "lodash-es";

const messages = import.meta.glob<Messages>("../../locales/*.po", {
  eager: true,
  import: "messages",
});

export function BaseLayout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const deferredLocation = useDeferredValue(location);

  const hook: BaseLocationHook = () => [deferredLocation, setLocation];

  const i18n = useMemo(() => {
    return setupI18n({
      locale: "en",
      messages: mapKeys(messages, (_, path) => {
        return path.replace(/^.*\/(\w+)\.po$/, "$1");
      }),
    });
  }, []);

  return (
    <I18nProvider i18n={i18n}>
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
    </I18nProvider>
  );
}

function LayoutInner({ children }: { children: ReactNode }) {
  const { notifyError } = useNotifications();

  return <SWRConfig value={{ onError: notifyError }}>{children}</SWRConfig>;
}

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

declare global {
  var NativeDate: typeof Date;
}
