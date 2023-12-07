import React, { ReactNode, useCallback, useState } from "react";

import classNames from "classnames";
import { FirebaseOptions } from "firebase/app";
import { User, getAuth, signOut } from "firebase/auth";

import {
  contestConverter,
  schoolConverter,
  solutionConverter,
  studentConverter,
  variantConverter,
} from "~/firebase/converters";
import { useCollection, useSignInWithPassword } from "~/firebase/hooks";
import { FirebaseLogin, useDb } from "~/firebase/login";

import { Layout } from "./layout";
import { TeacherProvider } from "./provider";

export function FirebaseTeacherLogin({
  config,
  children,
}: {
  config: FirebaseOptions;
  children: ReactNode;
}) {
  return (
    <FirebaseLogin config={config}>
      <TeacherLogin>{children}</TeacherLogin>
    </FirebaseLogin>
  );
}

function TeacherLogin({ children }: { children: ReactNode }) {
  const db = useDb();
  const auth = getAuth(db.app);

  const { signInWithPassword, loading, error } = useSignInWithPassword();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const signIn = () => signInWithPassword(email, password);

  if (auth.currentUser) {
    return <TeacherInner user={auth.currentUser}>{children}</TeacherInner>;
  }

  return (
    <div className="my-8 flex justify-center">
      <main className="max-w-md grow p-4">
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text text-lg">Email</span>
          </label>
          <input
            type="email"
            placeholder="Inserisci l'email"
            className="input input-bordered w-full max-w-md"
            onChange={(e) => setEmail(e.target.value)}
            value={email}
          />
        </div>
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text text-lg">Password</span>
          </label>
          <input
            type="password"
            placeholder="Insersci la password"
            className="input input-bordered w-full max-w-md"
            onChange={(e) => setPassword(e.target.value)}
            value={password}
          />
        </div>
        <span className="pt-1 text-red-600">{error?.message ?? <>&nbsp;</>}</span>
        <div className="flex justify-center pt-3">
          <button className="btn btn-success" onClick={signIn}>
            <span className={classNames("loading loading-spinner", !loading && "hidden")}></span>
            Accedi
          </button>
        </div>
      </main>
    </div>
  );
}

function TeacherInner({ user, children }: { user: User; children: ReactNode }) {
  const db = useDb();

  const [schools, setSchool] = useCollection("schools", schoolConverter, {
    constraints: { teacher: user.uid },
  });
  const [contests] = useCollection("contests", contestConverter);
  const [variants] = useCollection("variants", variantConverter);
  const [solutions] = useCollection("solutions", solutionConverter);

  const [students, setStudent] = useCollection("students", studentConverter, {
    constraints: {
      school: schools[0].id,
      contest: contests.map((contest) => contest.id),
    },
    orderBy: "createdAt",
  });

  const logout = useCallback(async () => {
    await signOut(getAuth(db.app));
    window.location.reload();
  }, [db]);

  return (
    <TeacherProvider
      schools={schools}
      setSchool={setSchool}
      students={students}
      setStudent={setStudent}
      contests={contests}
      variants={variants}
      solutions={solutions}
      logout={logout}>
      <Layout>{children}</Layout>
    </TeacherProvider>
  );
}
