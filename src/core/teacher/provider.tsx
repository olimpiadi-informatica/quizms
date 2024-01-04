import React, { ReactNode, createContext, useContext, useEffect, useState } from "react";

import Loading from "~/core/components/loading";
import { Contest, Participation, Student, StudentRestore, Variant } from "~/models";

import { TeacherLayout } from "./layout";

type TeacherProviderProps = {
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
  getPdfStatements: (pdfVariants: string[]) => Promise<(Uint8Array | ArrayBuffer)[]>;
  /** Hook per ottenere gli studenti di una scuola */
  useStudents: (
    participationId: string,
  ) => readonly [Student[], (student: Student) => Promise<void>];
  /** Hook per ottenere le richieste di accesso degli studenti */
  useStudentRestores: (
    participation: Participation,
  ) => readonly [
    StudentRestore[],
    (request: StudentRestore) => Promise<void>,
    (studentId: string) => Promise<void>,
  ];
};

const TeacherContext = createContext<TeacherProviderProps>({} as TeacherProviderProps);
TeacherContext.displayName = "TeacherContext";

export function TeacherProvider({
  contests,
  participations,
  children,
  ...props
}: Omit<TeacherProviderProps, "contest" | "participation" | "variants"> & {
  contests: Contest[];
  participations: Participation[];
  variants: Variant[];
  children: ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [contestId, setContestId] = useState<string | undefined>(
    participations.length === 1 ? participations[0]?.contestId : undefined,
  );
  const contest = contests.find((c) => c.id === contestId);
  const participation = participations.find((p) => p.contestId === contestId);
  const variants = Object.fromEntries(
    props.variants.filter((v) => v.contestId === contest?.id).map((v) => [v.id, v]),
  );

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
      logout={props.logout}>
      {participation && contest ? (
        <TeacherContext.Provider
          value={{
            ...props,
            contest,
            participation,
            variants,
          }}>
          {children}
        </TeacherContext.Provider>
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

export function useTeacher(): Omit<TeacherProviderProps, "useStudents" | "useStudentRestores"> {
  return useContext(TeacherContext);
}

export function useTeacherStudents(participationId: string) {
  const { useStudents } = useContext(TeacherContext);
  return useStudents(participationId);
}

export function useTeacherStudentRestores(participation: Participation) {
  const { useStudentRestores } = useContext(TeacherContext);
  return useStudentRestores(participation);
}
