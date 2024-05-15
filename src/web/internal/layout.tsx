import { ReactNode, Suspense } from "react";

import { Layout, useNotifications } from "@olinfo/react-components";
import { SWRConfig } from "swr";

import { Loading } from "~/components";

import "./index.css";

export function BaseLayout({ children }: { children: ReactNode }) {
  return (
    <Layout>
      <LayoutInner>
        <Suspense fallback={<Loading />}>{children}</Suspense>
      </LayoutInner>
    </Layout>
  );
}

function LayoutInner({ children }: { children: ReactNode }) {
  const { notifyError } = useNotifications();

  return <SWRConfig value={{ onError: notifyError }}>{children}</SWRConfig>;
}
