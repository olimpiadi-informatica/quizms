import type { Answer, Contest, Participation } from "~/models";
import type { Student } from "~/models/student";
import type { Contest as ContestResponse } from "../quizms-backend/bindings/Contest";
import type { Student as StudentResponse } from "../quizms-backend/bindings/Student";
import type { StudentAnswers } from "../quizms-backend/bindings/StudentAnswers";
import type { Venue } from "../quizms-backend/bindings/Venue";

export function answersToRest(
  answers: { [key: string]: Answer } | undefined,
  code: { [key: string]: string | undefined } | undefined,
): StudentAnswers {
  const studentAnswers: StudentAnswers = { answers: null, code: code || null };
  if (answers) {
    studentAnswers.answers = Object.fromEntries(
      Object.entries(answers).map(([id, answer]) => {
        if (typeof answer === "string") {
          return [id, { string: answer }];
        }
        if (typeof answer === "number") {
          return [id, { number: answer }];
        }
        return [id, null];
      }),
    );
  }
  return studentAnswers;
}

export function restToAnswers(studentAnswers: StudentAnswers): {
  answers: { [key: string]: Answer } | undefined;
  code: { [key: string]: string | undefined } | undefined;
} {
  const answers =
    studentAnswers.answers == null
      ? undefined
      : Object.fromEntries(
          Object.entries(studentAnswers.answers).map(([id, answer]) => {
            if (answer && "string" in answer) {
              return [id, answer.string];
            }
            if (answer && "number" in answer) {
              return [id, answer.number];
            }
            return [id, null];
          }),
        );
  return { answers, code: studentAnswers.code || undefined };
}

export function studentConverter(data: StudentResponse): Student {
  const { answers, code } = restToAnswers(data.answers);
  return {
    uid: "",
    userData: data.data.data,
    absent: data.data.absent,
    disabled: data.data.disabled,
    participationId: data.data.venueId,
    contestId: data.data.contestId,
    token: data.data.token,
    startedAt: data.contestRange ? new Date(data.contestRange.start) : undefined,
    finishedAt: data.contestRange ? new Date(data.contestRange.end) : undefined,
    variant: data.data.variantId,
    answers: answers,
    score: 0,
    maxScore: 0,
    code: code,
    createdAt: new Date(), // todo: figure out what to put here
    updatedAt: new Date(),
    id: data.data.id,
  };
}

export function contestConverter(data: ContestResponse): Contest {
  return {
    ...data,
    userData: [], // todo: convert properly
    hasOnline: data.onlineSettings != null,
    contestWindowStart: new Date(data.onlineSettings?.windowRange.start || 0),
    contestWindowEnd: new Date(data.onlineSettings?.windowRange.end || 0),
    hasPdf: data.offlineEnabled,
    allowStudentImport: data.allowStudentAdd,
    duration: Number(data.onlineSettings?.duration || 0),
    allowRestart: data.onlineSettings?.allowRestarts || false,
  };
}

export function participationConverter(data: Venue): Participation {
  return {
    id: data.id,
    contestId: data.contestId,
    schoolId: data.schoolId,
    name: data.name,
    teacher: data.teacher,
    token: data.token || "",
    startingTime: data.window ? new Date(data.window.start) : undefined,
    endingTime: data.window ? new Date(data.window.end) : undefined,
    finalized: data.finalized,
    pdfVariants: data.variantsToPrint,
    disabled: data.disabled,
  };
}
