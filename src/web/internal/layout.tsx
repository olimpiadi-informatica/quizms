import { type ReactNode, Suspense, useDeferredValue } from "react";

import { Layout, useNotifications } from "@olinfo/react-components";
import { SWRConfig } from "swr";
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
        </Suspense>
      </LayoutInner>
    </Layout>
  );
}

function LayoutInner({ children }: { children: ReactNode }) {
  const { notifyError } = useNotifications();

  return <SWRConfig value={{ onError: notifyError }}>{children}</SWRConfig>;
}
