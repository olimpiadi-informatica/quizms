import { type ComponentType, lazy } from "react";

import { Link, Redirect, Route, Switch, useParams } from "wouter";

import type { Contest, Participation, Student, StudentRestore, Variant } from "~/models";
import { ImpersonificationAuth } from "~/web/student/impersonification-auth";
import { UserDataForm } from "~/web/student/user-data-form";

import { TeacherContext, type TeacherContextProps } from "./context";
import { TeacherLayout } from "./layout";

type TeacherProviderProps = {
  participations: Participation[];
  setParticipation: (participation: Participation) => Promise<void>;
  contests: Contest[];
  variants: Variant[];
  logout: () => Promise<void>;
  statementComponent: ComponentType<Record<never, never>>;
  getPdfStatements: (
    contestId: string,
    variantIds: string[],
  ) => Promise<Record<string, Uint8Array | ArrayBuffer>>;
  useStudents: (
    participationId: string,
  ) => readonly [Student[], (student: Student) => Promise<void>];
  useStudentRestores: (
    participationId: string,
    token: string,
  ) => readonly [
    StudentRestore[],
    (request: StudentRestore) => Promise<void>,
    (studentId: string) => Promise<void>,
  ];
};

export function TeacherProvider({
  participations,
  contests,
  logout,
  ...props
}: TeacherProviderProps) {
  return (
    <TeacherLayout participations={participations} contests={contests} logout={logout}>
      <Route path="/">
        {participations.length === 1 && <Redirect to={`/${participations[0].contestId}`} />}
        <div className="flex w-full grow flex-col items-center justify-center gap-4">
          <p className="text-2xl">Seleziona una gara</p>
          <div className="flex flex-wrap justify-center gap-2">
            {participations.map((p) => (
              <Link key={p.id} className="btn btn-primary" href={`/${p.contestId}/`}>
                {contests.find((c) => c.id === p.contestId)?.name}
              </Link>
            ))}
          </div>
        </div>
      </Route>
      <Route path="/:contestId" nest>
        <ProviderInner
          participations={participations}
          contests={contests}
          logout={logout}
          {...props}
        />
      </Route>
    </TeacherLayout>
  );
}

const TeacherDashboard = lazy(() => import("./dashboard"));
const TeacherTable = lazy(() => import("./table"));

function ProviderInner({
  participations,
  setParticipation,
  contests,
  variants,
  logout,
  statementComponent: Statement,
  getPdfStatements,
  useStudents,
  useStudentRestores,
}: TeacherProviderProps) {
  const { contestId } = useParams();

  const contest = contests.find((c) => c.id === contestId);
  const participation = participations.find((p) => p.contestId === contestId);
  if (!contest || !participation) {
    return <Redirect to="/" />;
  }

  const contestVariants = Object.fromEntries(
    variants.filter((v) => v.contestId === contest?.id).map((v) => [v.id, v]),
  );

  const contextProps: TeacherContextProps = {
    contests,
    contest,
    participations,
    participation,
    setParticipation,
    variants: contestVariants,
    logout,
    getPdfStatements: () => getPdfStatements(contest.id, participation.pdfVariants ?? []),
    useStudentRestores,
    useStudents,
  };

  return (
    <TeacherContext.Provider value={contextProps}>
      <Switch>
        <Route path="/">
          <TeacherDashboard />
        </Route>
        <Route path="/students">
          <TeacherTable />
        </Route>
        <Route path="/students/:studentId">
          <ImpersonificationAuth>
            <UserDataForm />
            <Statement />
          </ImpersonificationAuth>
        </Route>
        <Route>
          <Redirect to="/" />
        </Route>
      </Switch>
    </TeacherContext.Provider>
  );
}
