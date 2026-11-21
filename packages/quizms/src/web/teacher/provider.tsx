import { type ComponentType, lazy, useMemo } from "react";

import { Trans } from "@lingui/react/macro";
import { Link, Redirect, Route, Switch, useParams } from "wouter";

import type { Announcement, Contest, Student, StudentRestore, Variant, Venue } from "~/models";
import { contestStatementFile, contestsLanguages } from "~/utils";
import { UiLanguageScope, useLocalize } from "~/web/components";
import { StudentForm } from "~/web/components/student-form";
import { ImpersonationAuth } from "~/web/student/impersonation-auth";

import { TeacherContext, type TeacherContextProps } from "./context";
import { TeacherLayout } from "./layout";

type TeacherProviderProps = {
  name: string;
  venues: Venue[];
  contests: Contest[];
  startContestWindow: (venueId: string) => Promise<void>;
  stopContestWindow: (venueId: string) => Promise<void>;
  finalizeVenue: (venueId: string) => Promise<void>;
  importStudents: (venueId: string, students: Student[]) => Promise<unknown>;
  setStudentsDisabled: (
    venueId: string,
    studentIds: string[],
    disabled: boolean,
  ) => Promise<unknown>;
  variants: Variant[];
  logout: () => Promise<void>;
  statementComponent: ComponentType<Record<never, never>>;
  /** `fileName` is the PDF of each variant to fetch, e.g. `statement.en.pdf` (default `statement.pdf`) */
  getPdfStatements: (
    contestId: string,
    variantIds: string[],
    fileName?: string,
  ) => Promise<Record<string, ArrayBuffer>>;
  useAnnouncements: (contestId: string) => Announcement[];
  useStudents: (venueId: string) => readonly [Student[], (student: Student) => Promise<void>];
  useStudentRestores: (
    venueId: string,
  ) => readonly [
    StudentRestore[],
    (request: StudentRestore) => Promise<void>,
    (studentId: string) => Promise<void>,
  ];
};

export function TeacherProvider({
  name,
  venues,
  contests,
  logout,
  ...props
}: TeacherProviderProps) {
  // The UI can be in any language of the contests of the teacher.
  const languages = useMemo(() => contestsLanguages(contests), [contests]);

  return (
    <UiLanguageScope languages={languages}>
      <TeacherLayout name={name} venues={venues} contests={contests} logout={logout}>
        <Route path="/">
          {venues.length === 1 && <Redirect to={`/${venues[0].contestId}`} />}
          {venues.length === 0 ? (
            <div className="flex w-full grow flex-col items-center justify-center gap-4">
              <p className="text-2xl">
                <Trans>You are not registered for any contest, please contact support</Trans>
              </p>
            </div>
          ) : (
            <div className="flex w-full grow flex-col items-center justify-center gap-4">
              <p className="text-2xl">
                <Trans>Select a contest</Trans>
              </p>
              <ContestLinks venues={venues} contests={contests} />
            </div>
          )}
        </Route>
        <Route path="/:contestId" nest>
          <ProviderInner
            name={name}
            venues={venues}
            contests={contests}
            logout={logout}
            {...props}
          />
        </Route>
      </TeacherLayout>
    </UiLanguageScope>
  );
}

/** Links to the contests of the teacher, in the UI language of the scope. */
function ContestLinks({ venues, contests }: { venues: Venue[]; contests: Contest[] }) {
  const localize = useLocalize();
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {venues.map((p) => (
        <Link key={p.id} className="btn btn-primary" href={`/${p.contestId}`}>
          {localize(contests.find((c) => c.id === p.contestId)?.name)}
        </Link>
      ))}
    </div>
  );
}

const TeacherDashboard = lazy(() => import("./dashboard"));
const TeacherTable = lazy(() => import("./table"));

function ProviderInner({
  venues,
  contests,
  startContestWindow,
  stopContestWindow,
  finalizeVenue,
  importStudents,
  setStudentsDisabled,
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
  const venue = venues.find((p) => p.contestId === contestId);
  if (!contest || !venue) {
    return <Redirect to="/" />;
  }

  const contestVariants = Object.fromEntries(
    variants.filter((v) => v.contestId === contest?.id).map((v) => [v.id, v]),
  );

  const contextProps: TeacherContextProps = {
    contests,
    contest,
    venues,
    venue,
    startContestWindow,
    stopContestWindow,
    finalizeVenue,
    importStudents,
    setStudentsDisabled,
    variants: contestVariants,
    logout,
    getPdfStatements: ({ language }) =>
      getPdfStatements(
        contest.id,
        venue.pdfVariants ?? [],
        contestStatementFile(contest.languages, language ?? contest.languages?.[0] ?? "it", "pdf"),
      ),
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
