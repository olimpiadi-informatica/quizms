import React, { ReactNode, useCallback, useState } from "react";

import classNames from "classnames";
import { format } from "date-fns";
import { it as dateLocaleIT } from "date-fns/locale";
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
import { Student } from "~/models/student";

import { Layout } from "./layout";
import { StudentProvider } from "./provider";

export function FirebaseStudentLogin({
  config,
  children,
}: {
  config: FirebaseOptions;
  children: ReactNode;
}) {
  return (
    <FirebaseLogin config={config}>
      <StudentLogin>{children}</StudentLogin>
    </FirebaseLogin>
  );
}

function StudentLogin({ children }: { children: ReactNode }) {
  const db = useDb();
  const auth = getAuth(db.app);

  const { signInWithPassword, loading, error } = useSignInWithPassword();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const signIn = () => signInWithPassword(email, password);

  const [contests] = useCollection("contests", contestConverter);
  //   if (auth.currentUser) {
  //     return <TeacherInner user={auth.currentUser}>{children}</TeacherInner>;
  //   }
  const [selectedContest, setSelectedContest] = useState(-1);
  const [student, setStudent] = useState<Student>({ id: window.crypto.randomUUID() });

  return (
    <div className="my-8 flex justify-center">
      <main className="max-w-md grow p-4">
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text text-lg">Gara</span>
          </label>
          <select
            className="select select-bordered w-full max-w-xs"
            value={selectedContest}
            onChange={(e: any) => setSelectedContest(e.target.value)}>
            <option value={-1}></option>
            {contests.map((contest, i) => (
              <option key={contest.id} value={i}>
                {contest.name}
              </option>
            ))}
          </select>
        </div>

        {selectedContest != -1 &&
          contests[selectedContest].personalInformation.map((pi) => {
            const value = student.personalInformation?.[pi.name];
            return (
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text text-lg">{pi.label}</span>
                </label>
                <input
                  type={pi.type}
                  placeholder={"Inserisci " + pi.label}
                  className="input input-bordered w-full max-w-md"
                  onChange={(e) => {
                    const info: any = student.personalInformation ?? {};
                    info[pi.name] = e.target.value;
                    setStudent({ ...student, personalInformation: info });
                  }}
                  value={
                    value instanceof Date
                      ? format(value, "P", { locale: dateLocaleIT })
                      : (value as string) ?? ""
                  }
                />
              </div>
            );
          })}

        <div className="form-control w-full">
          <label className="label">
            <span className="label-text text-lg">Codice scuola</span>
          </label>
          <input
            type="text"
            placeholder="Inserisci codice scuola"
            className="input input-bordered w-full max-w-md"
            onChange={(e) => setStudent({ ...student, token: e.target.value })}
            value={student.token}
          />
        </div>

        <span className="pt-1 text-red-600">{error?.message ?? <>&nbsp;</>}</span>
        <div className="flex justify-center pt-3">
          <button className="btn btn-success" onClick={signIn}>
            <span className={classNames("loading loading-spinner", !loading && "hidden")}></span>
            Inizia
          </button>
        </div>
      </main>
    </div>
  );
}

// function TeacherInner({ user, children }: { user: User; children: ReactNode }) {
//   const db = useDb();

//   const [schools, setSchool] = useCollection("schools", schoolConverter, {
//     constraints: { teacher: user.uid },
//   });
//   const [contests] = useCollection("contests", contestConverter);
//   const [variants] = useCollection("variants", variantConverter);
//   const [solutions] = useCollection("solutions", solutionConverter);

//   const school = schools[0];

//   const [students, setStudent] = useCollection("students", studentConverter, {
//     constraints: {
//       school: school.id,
//       contest: contests.map((contest) => contest.id),
//     },
//     orderBy: "createdAt",
//   });

//   const logout = useCallback(async () => {
//     await signOut(getAuth(db.app));
//     window.location.reload();
//   }, [db]);

//   return (
//     <StudentProvider
//       school={school}
//       setStudent={setStudent}>
//       <Layout>{children}</Layout>
//     </StudentProvider>
//   );
// }
