import { Student } from "~/models/student";
import { type Student as StudentResponse } from "../quizms-backend/bindings/Student";
import { Contest as ContestResponse } from "../quizms-backend/bindings/Contest";
import { Contest, Participation } from "~/models";
import { Venue } from "../quizms-backend/bindings/Venue";
export function studentConverter(data: StudentResponse): Student {
  const answers = Object.fromEntries(
    Object.entries(data.answers).map(([k, v], i) => {
      let ans = null;
      if (v && "string" in v) {
        ans = v["string"];
      } else if (v && "number" in v) {
        ans = v["number"];
      }
      return [k, ans];
    }),
  );
  return {
    uid: "",
    userData: data.data.data,
    absent: data.data.absent,
    disabled: data.data.disabled,
    participationId: data.data.venueId,
    contestId: data.data.contestId,
    token: data.data.token,
    startedAt: data.contestRange
      ? new Date(data.contestRange.start)
      : undefined,
    finishedAt: data.contestRange ? new Date(data.contestRange.end) : undefined,
    variant: data.data.variantId,
    answers: answers,
    score: 0,
    maxScore: 0,
    extraData: {},
    createdAt: new Date(), // todo: figure out what to put here
    updatedAt: new Date(),
    id: data.data.id,
  };
}

export function contestConverter(data: ContestResponse): Contest {
  return {
    id: data.id,
    name: data.name,
    longName: data.longName,
    problemIds: data.problemIds,
    userData: [], // todo: convert properly
    contestWindowStart: new Date(),
    contestWindowEnd: new Date(),
    hasVariants: data.hasVariants,
    hasOnline: data.onlineSettings != null,
    hasPdf: data.offlineEnabled,
    allowStudentImport: data.allowStudentAdd,
    allowStudentEdit: data.allowStudentEdit,
    allowStudentDelete: data.allowStudentDelete,
    allowAnswerEdit: data.allowAnswerEdit,
    duration: 1000, // todo: figure out what to put here
    allowRestart: false,
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
