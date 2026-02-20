import { type ReactNode, useCallback, useMemo, useState } from "react";

import {
  type Answer,
  type Contest,
  type Participation,
  type Student,
  type Variant,
  type VariantsConfig,
  variantSchema,
} from "@olinfo/quizms/models";
import { StudentProvider } from "@olinfo/quizms/student";
import { Rng, validate } from "@olinfo/quizms/utils";
import { addMinutes, subSeconds } from "date-fns";
import { omit } from "lodash-es";
import useSWR from "swr";

import {
  getStudentIframe,
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
  const updateStudent = useCallback(
    async (
      iframeFn: (student: Student) => Promise<Student | null>,
      updateFn: (student: Student) => Student,
    ) => {
      if (type === "anonymous") {
        setAnonymousStudent(updateFn);
      } else {
        await mutate((student) => (student ? iframeFn(updateFn(student)) : null), {
          optimisticData: (student) => (student ? updateFn(student) : null),
        });
      }
    },
    [type, mutate],
  );

  const { data: variant } = useSWR(["variant", contest.id, student.variant], getVariant);

  const mockParticipation: Participation = useMemo(
    () => ({
      id: "",
      schoolId: "",
      contestId: contest.id,
      name: "",
      startingTime: student.startedAt,
      finalized: false,
      disabled: false,
    }),
    [contest.id, student.startedAt],
  );

  const setAnswer = useCallback(
    async (problemId: string, answer: Answer | undefined) => {
      await updateStudent(setAnswersIframe, (student) => ({
        ...student,
        answers:
          answer == null
            ? omit(student.answers, problemId)
            : { ...student.answers, [problemId]: answer },
      }));
    },
    [updateStudent],
  );

  const submit = useCallback(async () => {
    await updateStudent(submitIframe, (student) => ({ ...student, finishedAt: new Date() }));
  }, [updateStudent]);

  const reset = useCallback(async () => {
    await updateStudent(resetIframe, (student) => ({
      ...student,
      answers: {},
      startedAt: undefined,
      finishedAt: undefined,
      variant: getRandomVariant(contest),
    }));
  }, [contest, updateStudent]);

  const start = useCallback(async () => {
    const now = new Date();
    await updateStudent(startIframe, (student) => ({
      ...student,
      startedAt: subSeconds(now, 2),
      finishedAt: addMinutes(now, contest.hasOnline ? contest.duration : 0),
    }));
  }, [contest, updateStudent]);

  return (
    <TrainingStatementContext.Provider value={{ start }}>
      <title>{contest.name}</title>
      <StudentProvider
        contest={contest}
        participation={mockParticipation}
        student={student}
        setAnswer={setAnswer}
        submit={submit}
        reset={reset}
        enforceFullscreen={false}
        schema={variant?.schema}>
        {children}
      </StudentProvider>
    </TrainingStatementContext.Provider>
  );
}
TrainingProvider.displayName = "TrainingProvider";

function createAnonymousStudent(contest: VariantsConfig): Student {
  return {
    id: "",
    userData: {
      name: "Utente",
      surname: "anonimo",
    },
    answers: {},
    contestId: contest.id,
    variant: getRandomVariant(contest),
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
