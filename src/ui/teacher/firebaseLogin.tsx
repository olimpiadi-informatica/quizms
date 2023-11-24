import React, { ReactNode, useCallback, useRef, useState } from "react";

import classNames from "classnames";
import { FirebaseOptions } from "firebase/app";
import { User, getAuth, signOut } from "firebase/auth";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { GraduationCap, UserIcon } from "lucide-react";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";
import { useSignInWithEmailAndPassword } from "react-firebase-hooks/auth";
import z from "zod";

import { contestConverter, schoolConverter, teacherConverter } from "~/firebase/converters";
import { FirebaseLogin, useDb } from "~/firebase/login";
import { contestSchema } from "~/models/contest";
import { schoolSchema } from "~/models/school";
import { teacherSchema } from "~/models/teacher";
import { variantSchema } from "~/models/variant";
import Modal from "~/ui/components/modal";
import useSuspense from "~/ui/components/suspense";
import { TeacherProvider } from "~/ui/teacher/provider";
import validate from "~/utils/validate";

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

  const [signInWithEmailAndPassword, , loading, error] = useSignInWithEmailAndPassword(auth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const signIn = () => signInWithEmailAndPassword(email, password);

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

  const { teacher, school, contests, variants } = useSuspense(async function loadTeacherProvider() {
    const teacherRef = doc(db, "teachers", user.uid).withConverter(teacherConverter);
    const teacherSnap = await getDoc(teacherRef);
    const teacher = validate(teacherSchema, {
      ...teacherSnap.data(),
      name: user.displayName,
    });

    const schoolRef = doc(db, "schools", teacher.school).withConverter(schoolConverter);
    const schoolSnap = await getDoc(schoolRef);
    const school = validate(schoolSchema, schoolSnap.data());

    const contestsRef = collection(db, "contests").withConverter(contestConverter);
    const contestsSnap = await getDocs(contestsRef);
    const contests = validate(
      z.record(contestSchema),
      Object.fromEntries(contestsSnap.docs.map((doc) => [doc.id, doc.data()])),
    );

    const variantsRef = collection(db, "variants");
    const variantsSnap = await getDocs(variantsRef);
    const variants = validate(
      z.record(variantSchema),
      Object.fromEntries(variantsSnap.docs.map((doc) => [doc.id, doc.data()])),
    );

    return { teacher, school, contests, variants };
  });

  return (
    <TeacherProvider name={teacher.name} school={school} contests={contests} variants={variants}>
      <div>
        <Navbar name={teacher.name} school={school.name} />
        <ErrorBoundary FallbackComponent={ErrorView}>
          <VerifiedUserWrapper user={user}>{children}</VerifiedUserWrapper>
        </ErrorBoundary>
      </div>
    </TeacherProvider>
  );
}

function Navbar({ name, school }: { name?: string; school?: string }) {
  const db = useDb();

  const modalRef = useRef<HTMLDialogElement>(null);

  const logOut = useCallback(async () => {
    await signOut(getAuth(db.app));
    window.location.reload();
  }, [db]);

  return (
    <div className="not-prose sticky top-0 z-50 mb-4 border-b border-base-content">
      <div className="absolute inset-y-0 left-1/2 -z-10 w-screen -translate-x-1/2 overflow-x-auto bg-base-100" />
      <div className="flex items-center justify-between py-2">
        <div className="flex gap-2">
          <GraduationCap className="h-full pt-1" />
          {school}
        </div>
        <button
          className="btn btn-ghost no-animation"
          onClick={() => modalRef.current?.showModal()}>
          <UserIcon />
          <span className="uppercase">{name || "Utente anonimo"}</span>
        </button>
      </div>
      <Modal title="Vuoi cambiare utente?" ref={modalRef}>
        <div className="text-md mt-5 flex flex-row justify-center">
          <button className="btn btn-error" onClick={logOut}>
            Cambia utente
          </button>
        </div>
      </Modal>
    </div>
  );
}

function VerifiedUserWrapper({ user, children }: { user: User; children: ReactNode }) {
  if (!user.emailVerified) {
    throw new Error("Utente non autorizzato");
  }
  return children;
}

function ErrorView({ error }: FallbackProps) {
  return (
    <div className="m-auto my-64 w-64">
      <p className="text-red-500">{error.message}</p>
    </div>
  );
}
