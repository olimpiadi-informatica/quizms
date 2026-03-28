import { lazy, Suspense } from "react";

import { ErrorBoundary, Loading } from "@olinfo/quizms/components";
import { createApp } from "@olinfo/quizms/entry";
import { CookiesProvider } from "react-cookie";
import { Route, Router, Switch } from "wouter";

import TeacherEntry from "./teacher";

const StudentEntry = lazy(() => import("./student"));

export default function createRestEntry() {
  return createApp(
    <Router base={process.env.NODE_ENV === "development" ? "/rest" : ""}>
      <CookiesProvider>
        <ErrorBoundary>
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
        </ErrorBoundary>
      </CookiesProvider>
    </Router>,
  );
}
