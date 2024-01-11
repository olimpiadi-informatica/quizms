import React, { ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";

import { Loading } from "~/components";
import { Contest, Participation, Student, StudentRestore, Variant } from "~/models";

import { TeacherLayout } from "./layout";

type TeacherContextProps = {
  /** Gara attiva */
  participation: Participation;
  /** Funzione per modificare i dati della scuola */
  setParticipation: (participation: Participation) => Promise<void>;
  /** Contest attivi */
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
  children: ReactNode;
};

export function TeacherProvider({
  participations,
  setParticipation,
  contests,
  variants,
  logout,
  getPdfStatements,
  useStudents,
  useStudentRestores,
  children,
}: TeacherProviderProps) {
  const [loading, setLoading] = useState(true);
  const [contestId, setContestId] = useState<string | undefined>(
    participations.length === 1 ? participations[0]?.contestId : undefined,
  );
  const contest = contests.find((c) => c.id === contestId);
  const participation = participations.find((p) => p.contestId === contestId);

  const contextProps: TeacherContextProps = useMemo(() => {
    const filteredVariants = Object.fromEntries(
      variants.filter((v) => v.contestId === contest?.id).map((v) => [v.id, v]),
    );
    return {
      contest: contest!,
      participation: participation!,
      setParticipation,
      variants: filteredVariants,
      logout,
      getPdfStatements: () =>
        getPdfStatements(contest?.statementVersion ?? 0, participation?.pdfVariants ?? []),
      useStudentRestores,
      useStudents,
    };
  }, [
    contest,
    getPdfStatements,
    logout,
    participation,
    setParticipation,
    useStudentRestores,
    useStudents,
    variants,
  ]);

  useEffect(() => {
    setLoading(false);
    onHashChange();

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);

    function onHashChange() {
      setContestId(window.location.hash.slice(1));
    }
  }, []);

  useEffect(() => {
    if (contestId) {
      window.location.hash = contestId ?? "";
    }
  }, [contestId]);

  if (loading) {
    return <Loading />;
  }

  return (
    <TeacherLayout
      contests={contests}
      participations={participations}
      activeContest={contest}
      activeParticipation={participation}
      setActiveContest={setContestId}
      logout={logout}>
      {participation && contest ? (
        <TeacherContext.Provider value={contextProps}>{children}</TeacherContext.Provider>
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-3">
          <p className="text-2xl">Seleziona una gara</p>
          {participations.map((p) => (
            <button key={p.id} className="btn btn-info" onClick={() => setContestId(p.contestId)}>
              {contests.find((c) => c.id === p.contestId)?.name}
            </button>
          ))}
        </div>
      )}
    </TeacherLayout>
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
