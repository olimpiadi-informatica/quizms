import { createContext, lazy, useContext } from "react";

import { Link, Redirect, Route, Switch, useParams } from "wouter";

import type { Contest, Participation, Student, StudentRestore, Variant } from "~/models";
import { ImpersonificationAuth } from "~/web/student/impersonification-auth";
import { PersonalInformationForm } from "~/web/student/personal-information-form";

import { TeacherLayout } from "./layout";

type TeacherContextProps = {
  /** Tutte le partecipazioni */
  participations: Participation[];
  /** Partecipazione selezionata */
  participation: Participation;
  /** Funzione per modificare i dati della scuola */
  setParticipation: (participation: Participation) => Promise<void>;

  /** Tutte le gare */
  contests: Contest[];
  /** Gara selezionata */
  contest: Contest;

  /** Varianti dei testi */
  variants: Record<string, Variant>;
  /** Funzione per effettuare il logout */
  logout: () => Promise<void>;
  /** Funzione per ottenere i pdf dei testi */
  getPdfStatements: () => Promise<(Uint8Array | ArrayBuffer)[]>;
  /** Hook per ottenere gli studenti di una scuola */
  useStudents: (
    participationId: string,
  ) => readonly [Student[], (student: Student) => Promise<void>];
  /** Hook per ottenere le richieste di accesso degli studenti */
  useStudentRestores: (
    participationId: string,
    token: string,
  ) => readonly [
    StudentRestore[],
    (request: StudentRestore) => Promise<void>,
    (studentId: string) => Promise<void>,
  ];
};

const TeacherContext = createContext<TeacherContextProps>({} as TeacherContextProps);
TeacherContext.displayName = "TeacherContext";

type TeacherProviderProps = {
  participations: Participation[];
  setParticipation: (participation: Participation) => Promise<void>;
  contests: Contest[];
  variants: Variant[];
  logout: () => Promise<void>;
  getPdfStatements: (
    statementVersion: number,
    variantIds: string[],
  ) => Promise<(Uint8Array | ArrayBuffer)[]>;
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
    getPdfStatements: () =>
      getPdfStatements(contest.statementVersion, participation.pdfVariants ?? []),
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
            <PersonalInformationForm />
            {/* TODO: statement */}
          </ImpersonificationAuth>
        </Route>
        <Route>
          <Redirect to="/" />
        </Route>
      </Switch>
    </TeacherContext.Provider>
  );
}

export function useTeacher(): Omit<TeacherContextProps, "useStudents" | "useStudentRestores"> {
  return useContext(TeacherContext);
}

export function useTeacherStudents() {
  const { participation, useStudents } = useContext(TeacherContext);
  return useStudents(participation.id);
}

export function useTeacherStudentRestores() {
  const { participation, useStudentRestores } = useContext(TeacherContext);
  return useStudentRestores(participation.id, participation.token ?? "");
}
