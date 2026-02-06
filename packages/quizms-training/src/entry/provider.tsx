import { type ReactNode, useCallback, useEffect, useState } from "react";

import {
  type Contest,
  type Participation,
  type Student,
  type Variant,
  type VariantsConfig,
  variantSchema,
} from "@olinfo/quizms/models";
import { StudentProvider } from "@olinfo/quizms/student";
import { Rng, validate } from "@olinfo/quizms/utils";
import useSWR from "swr";

import { getIframeStudent, saveIframeStudent } from "./iframe";

export function TrainingProvider({
  contest,
  children,
}: {
  contest: Contest & VariantsConfig;
  children: ReactNode;
}) {
  const { data: iframeStudent } = useSWR(["student", contest.id], getIframeStudent, {
    suspense: true,
  });

  const [student, setStudent] = useState<Student>(iframeStudent ?? anonymousStudent(contest));
  useEffect(() => saveIframeStudent(student), [student]);

  const { data: variant } = useSWR(["variant", contest.id, student.variant], getVariant);

  const mockParticipation: Participation = {
    id: "",
    schoolId: "",
    contestId: contest.id,
    name: "",
    startingTime: student.startedAt,
    finalized: false,
    disabled: false,
  };

  const onSubmit = useCallback(async () => {}, []);

  const reset = useCallback(() => {
    setStudent({
      ...student,
      answers: {},
      extraData: {},
      startedAt: undefined,
      finishedAt: undefined,
      variant: getRandomVariant(contest),
    });
  }, [student, contest]);

  return (
    <>
      <title>{contest.name}</title>
      <StudentProvider
        contest={contest}
        participation={mockParticipation}
        student={student}
        setStudent={setStudent}
        onSubmit={onSubmit}
        reset={reset}
        enforceFullscreen={false}
        schema={variant?.schema}>
        {children}
      </StudentProvider>
    </>
  );
}
TrainingProvider.displayName = "TrainingProvider";

function anonymousStudent(contest: Contest & VariantsConfig): Student {
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
