import { lazy } from "react";

import { createApp } from "@olinfo/quizms/entry";
import { Route, Router, Switch } from "wouter";

import { FirebaseLogin } from "~/web/common/base-login";

const AdminEntry = lazy(() => import("./admin"));
const TeacherEntry = lazy(() => import("./teacher"));
const StudentEntry = lazy(() => import("./student"));

export default function createFirebaseEntry() {
  return createApp(
    <Router base={process.env.NODE_ENV === "development" ? "/firebase" : ""}>
      <FirebaseLogin>
        <Switch>
          <Route path="/admin" nest>
            <AdminEntry />
          </Route>
          <Route path="/teacher" nest>
            <TeacherEntry />
          </Route>
          <Route path="/">
            <StudentEntry />
          </Route>
        </Switch>
      </FirebaseLogin>
    </Router>,
  );
}
