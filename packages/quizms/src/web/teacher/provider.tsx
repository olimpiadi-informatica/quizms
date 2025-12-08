import { type ComponentType, lazy } from "react";

import { Link, Redirect, Route, Switch, useParams } from "wouter";

import type {
  Announcement,
  Contest,
  Participation,
  Student,
  StudentRestore,
  Variant,
} from "~/models";
import { StudentForm } from "~/web/components/student-form";
import { ImpersonationAuth } from "~/web/student/impersonation-auth";

import { TeacherContext, type TeacherContextProps } from "./context";
import { TeacherLayout } from "./layout";

type TeacherProviderProps = {
  participations: Participation[];
  contests: Contest[];
  startParticipation: (participationId: string) => Promise<void>;
  stopParticipation: (participationId: string) => Promise<void>;
  finalizeParticipation: (participationId: string) => Promise<void>;
  variants: Variant[];
  logout: () => Promise<void>;
  statementComponent: ComponentType<Record<never, never>>;
  getPdfStatements: (
    contestId: string,
    variantIds: string[],
  ) => Promise<Record<string, ArrayBuffer>>;
  useAnnouncements: (contestId: string) => Announcement[];
  useStudents: (
    participationId: string,
  ) => readonly [Student[], (student: Student) => Promise<void>];
  useStudentRestores: (
    participationId: string,
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
              <Link key={p.id} className="btn btn-primary" href={`/${p.contestId}`}>
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
  contests,
  startParticipation,
  stopParticipation,
  finalizeParticipation,
  variants,
  logout,
  statementComponent: Statement,
  getPdfStatements,
  useAnnouncements,
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
    startParticipation,
    stopParticipation,
    finalizeParticipation,
    variants: contestVariants,
    logout,
    getPdfStatements: () => getPdfStatements(contest.id, participation.pdfVariants ?? []),
    useAnnouncements,
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
          <ImpersonationAuth>
            <StudentForm />
            <Statement />
          </ImpersonationAuth>
        </Route>
        <Route>
          <Redirect to="/" />
        </Route>
      </Switch>
    </TeacherContext.Provider>
  );
}
