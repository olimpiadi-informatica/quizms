import React, { ReactNode, useCallback, useState } from "react";

import { FirebaseOptions } from "firebase/app";
import { User, getAuth, signOut } from "firebase/auth";

import { Button } from "~/core/components/button";
import { TeacherProvider } from "~/core/teacher/provider";
import { FirebaseLogin, useDb } from "~/firebase/baseLogin";
import {
  contestConverter,
  schemaDocConverter,
  schoolConverter,
  solutionConverter,
  studentConverter,
} from "~/firebase/converters";
import { useCollection, useSignInWithPassword } from "~/firebase/hooks";

export function TeacherLogin({
  config,
  children,
}: {
  config: FirebaseOptions;
  children: ReactNode;
}) {
  return (
    <FirebaseLogin config={config}>
      <TeacherLoginInner>{children}</TeacherLoginInner>
    </FirebaseLogin>
  );
}

function TeacherLoginInner({ children }: { children: ReactNode }) {
  const db = useDb();
  const auth = getAuth(db.app);

  const { signInWithPassword, error } = useSignInWithPassword();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const signIn = () => signInWithPassword(email, password);

  if (auth.currentUser) {
    return <TeacherInner user={auth.currentUser}>{children}</TeacherInner>;
  }

  return (
    <div className="my-8 flex justify-center">
      <form className="max-w-md grow p-4">
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text text-lg">Email</span>
          </label>
          <input
            type="email"
            autoComplete="email"
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
            autoComplete="current-password"
            placeholder="Insersci la password"
            className="input input-bordered w-full max-w-md"
            onChange={(e) => setPassword(e.target.value)}
            value={password}
          />
        </div>
        <span className="pt-1 text-error">{error?.message ?? <>&nbsp;</>}</span>
        <div className="flex justify-center pt-3">
          <Button className="btn-success" onClick={signIn}>
            Accedi
          </Button>
        </div>
      </form>
    </div>
  );
}

function TeacherInner({ user, children }: { user: User; children: ReactNode }) {
  const db = useDb();

  const [schools, setSchool] = useCollection("schools", schoolConverter, {
    constraints: { teacher: user.uid },
    subscribe: true,
  });
  const [contests] = useCollection("contests", contestConverter);
  const [variants] = useCollection("schema", schemaDocConverter);
  const [solutions] = useCollection("solutions", solutionConverter);

  const [students, setStudent] = useCollection("students", studentConverter, {
    constraints: {
      school: schools.map((s) => s.id),
    },
    orderBy: "createdAt",
    subscribe: true,
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
      {children}
    </TeacherProvider>
  );
}
