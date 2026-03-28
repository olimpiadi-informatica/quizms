import { type ReactNode, useCallback, useMemo, useState } from "react";

import { TitleProvider } from "@olinfo/quizms/components";
import {
  type Answer,
  type Contest,
  type Student,
  type Variant,
  type VariantsConfig,
  type Venue,
  variantSchema,
} from "@olinfo/quizms/models";
import { StudentProvider } from "@olinfo/quizms/student";
import { Rng, validate } from "@olinfo/quizms/utils";
import { addMinutes, subSeconds } from "date-fns";
import useSWR, { preload } from "swr";

import {
  getStudentIframe,
  getTitleIframe,
  logoutIframe,
  resetIframe,
  setAnswersIframe,
  startIframe,
  submitIframe,
} from "./iframe";
import { TrainingStatementContext } from "./statement";

export function TrainingProvider({
  contest,
  children,
}: {
  contest: Contest & VariantsConfig;
  children: ReactNode;
}) {
  const { data: title } = useSWR("getTitle", getTitleIframe, { suspense: true });

  const { data: iframeStudent, mutate } = useSWR(["student", contest.id], getStudentIframe, {
    suspense: true,
  });
  const [anonymousStudent, setAnonymousStudent] = useState<Student>(
    createAnonymousStudent(contest),
  );

  const { student, type } = useMemo(
    () =>
      iframeStudent
        ? { type: "iframe", student: iframeStudent }
        : { type: "anonymous", student: anonymousStudent },
    [iframeStudent, anonymousStudent],
  );

  const { data: variant } = useSWR(
    student.variantId && ["variant", contest.id, student.variantId],
    getVariant,
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
    },
  );

  const updateStudent = useCallback(
    async (
      iframeFn: (student: Student, contest: Contest) => Promise<Student | null>,
      updateFn: (student: Student) => Student,
    ) => {
      if (type === "anonymous") {
        setAnonymousStudent(updateFn);
      } else {
        await mutate((student) => (student ? iframeFn(updateFn(student), contest) : null), {
          optimisticData: (student) => (student ? updateFn(student) : null),
        });
      }
    },
    [type, contest, mutate],
  );

  const mockVenue: Venue = useMemo(
    () => ({
      id: "",
      schoolId: "",
      contestId: contest.id,
      name: "",
      participationWindow: student.participationWindow,
      finalized: false,
      disabled: false,
      pdfVariants: [],
      token: null,
    }),
    [contest.id, student.participationWindow],
  );

  const setAnswer = useCallback(
    async (problemId: string, answer: Answer) => {
      if (!variant) throw new Error("Variant non loaded");
      await updateStudent(
        setAnswersIframe(variant),
        (student) =>
          ({ ...student, answers: { ...student.answers, [problemId]: answer } }) satisfies Student,
      );
    },
    [updateStudent, variant],
  );

  const submit = useCallback(async () => {
    await updateStudent(
      submitIframe,
      (student) =>
        ({
          ...student,
          participationWindow: { start: student.participationWindow!.start, end: new Date() },
        }) satisfies Student,
    );
  }, [updateStudent]);

  const reset = useCallback(async () => {
    await updateStudent(
      resetIframe,
      (student) =>
        ({
          ...student,
          answers: {},
          participationWindow: null,
        }) satisfies Student,
    );
  }, [updateStudent]);

  const logout = useCallback(async () => {
    await updateStudent(logoutIframe, (student) => student);
  }, [updateStudent]);

  const start = useCallback(async () => {
    const now = new Date();
    const variantId = getRandomVariant(contest);
    const variant = await preload(["variant", contest.id, variantId], getVariant);
    await updateStudent(
      startIframe(variant),
      (student) =>
        ({
          ...student,
          variantId,
          participationWindow: {
            start: subSeconds(now, 2),
            end: addMinutes(now, contest.onlineSettings?.duration ?? 0),
          },
        }) satisfies Student,
    );
  }, [contest, updateStudent]);

  return (
    <TitleProvider title={title}>
      <TrainingStatementContext.Provider value={{ start }}>
        <StudentProvider
          contest={contest}
          venue={mockVenue}
          student={student}
          setAnswer={setAnswer}
          submit={submit}
          reset={reset}
          logout={logout}
          enforceFullscreen={false}
          schema={variant?.schema}>
          {children}
        </StudentProvider>
      </TrainingStatementContext.Provider>
    </TitleProvider>
  );
}
TrainingProvider.displayName = "TrainingProvider";

function createAnonymousStudent(contest: VariantsConfig): Student {
  return {
    id: "",
    name: "Utente",
    surname: "anonimo",
    userData: {},
    answers: {},
    contestId: contest.id,
    absent: false,
    disabled: false,
    venueId: "",
    token: null,
    participationWindow: null,
    variantId: "",
    score: null,
    createdAt: new Date(),
  };
}

const rng = new Rng();

function getRandomVariant(contest: VariantsConfig): string {
  return rng.choice(contest.variantIds);
}

async function getVariant([, contestId, variantId]: [string, string, string]): Promise<Variant> {
  const resp = await fetch(`/variants/${contestId}/${variantId}/answers.json`);
  if (!resp.ok) throw new Error("Failed to fetch schema");
  const json: unknown = await resp.json();
  return validate(variantSchema, json);
}
