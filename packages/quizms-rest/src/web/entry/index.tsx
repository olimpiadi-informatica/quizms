import { lazy, type PropsWithChildren, Suspense, useCallback } from "react";

import { ErrorBoundary, Loading } from "@olinfo/quizms/components";
import { createApp } from "@olinfo/quizms/entry";
import { CookiesProvider, useCookies } from "react-cookie";
import { Route, Router, Switch } from "wouter";

import TeacherEntry from "./teacher";

const StudentEntry = lazy(() => import("./student"));

export default function createRestEntry() {
  return createApp(
    <Router base={process.env.NODE_ENV === "development" ? "/rest" : ""}>
      <CookiesProvider>
        <RestErrorBoundary>
          <Suspense fallback={<Loading />}>
            <Switch>
              <Route path="/admin" nest />
              <Route path="/teacher" nest>
                <TeacherEntry />
              </Route>
              <Route path="/">
                <StudentEntry />
              </Route>
            </Switch>
          </Suspense>
        </RestErrorBoundary>
      </CookiesProvider>
    </Router>,
  );
}

function RestErrorBoundary({ children }: PropsWithChildren) {
  const [, , removeCookie] = useCookies(["token"]);
  const onReset = useCallback(() => {
    removeCookie("token", { path: "/" });
    window.location.reload();
  }, [removeCookie]);
  return <ErrorBoundary onReset={onReset}>{children}</ErrorBoundary>;
}
