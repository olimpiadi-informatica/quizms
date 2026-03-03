import { type ReactNode, useCallback, useMemo, useState } from "react";

import { omit } from "lodash-es";
import { Link, Route, Switch } from "wouter";

import type { Answer, Contest, Student, Venue } from "~/models";
import { StudentProvider } from "~/web/student/provider";

export function DevRoutes({ contests, children }: { contests: Contest[]; children: ReactNode }) {
  return (
    <Switch>
      <Route path="/">
        <ContestList contests={contests} />
      </Route>
      {children}
    </Switch>
  );
}
DevRoutes.displayName = "DevRoutes";

function ContestList({ contests }: { contests: Contest[] }) {
  return (
    <div className="h-dvh overflow-auto">
      <div className="prose mx-auto p-4 lg:max-w-4xl">
        <ul>
          {contests.map((c) => (
            <li key={c.id}>
              <Link href={`/${c.id}`}>{c.name}</Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
ContestList.displayName = "ContestList";

export function DevProvider({ contest, children }: { contest: Contest; children: ReactNode }) {
  const [student, setStudent] = useState<Student>({
    id: "",
    userData: {
      name: "Utente",
      surname: "anonimo",
    },
    answers: {},
    contestId: contest.id,
    variantId: "0",
  });

  const mockVenue: Venue = useMemo(
    () => ({
      id: "",
      schoolId: "",
      contestId: contest.id,
      name: "",
      contestWindow: student.contestRange,
      pdfVariants: [],
      finalized: false,
      disabled: false,
    }),
    [contest.id, student.contestRange],
  );

  const setAnswer = useCallback((problemId: string, answer: Answer | undefined) => {
    setStudent((student) => ({
      ...student,
      answers:
        answer == null
          ? omit(student.answers, problemId)
          : { ...student.answers, [problemId]: answer },
    }));
  }, []);

  const submit = useCallback(() => {
    setStudent((student) => ({
      ...student,
      contestRange: { start: student.contestRange!.start, end: new Date() },
    }));
  }, []);

  const reset = useCallback(() => {
    setStudent(
      (student): Student => ({
        ...student,
        answers: {},
        contestRange: undefined,
      }),
    );
  }, []);

  return (
    <StudentProvider
      contest={contest}
      venue={mockVenue}
      student={student}
      setAnswer={setAnswer}
      submit={submit}
      reset={reset}
      enforceFullscreen={false}>
      {children}
    </StudentProvider>
  );
}
DevProvider.displayName = "DevProvider";
