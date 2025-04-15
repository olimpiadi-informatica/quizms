import type { Answer, Contest, Participation, UserData } from "~/models";
import type { Student } from "~/models/student";
import type { Contest as ContestResponse } from "../quizms-backend/bindings/Contest";
import type { Student as StudentResponse } from "../quizms-backend/bindings/Student";
import type { StudentAnswers } from "../quizms-backend/bindings/StudentAnswers";
import type { UserData as RestUserData } from "../quizms-backend/bindings/UserData";
import type { UserDataField } from "../quizms-backend/bindings/UserDataField";
import type { UserDataType } from "../quizms-backend/bindings/UserDataType";
import type { Venue } from "../quizms-backend/bindings/Venue";

export function restToUserdata(restUserData: UserDataField): UserData {
  let userdatatype:
    | { type: "text" }
    | { type: "number"; min?: number; max?: number }
    | { type: "date"; min: Date; max: Date } = { type: "text" };
  if (restUserData.type.type === "number") {
    userdatatype = {
      type: "number",
      min: restUserData.type.min || undefined,
      max: restUserData.type.max || undefined,
    };
  }
  if (restUserData.type.type === "date") {
    userdatatype = {
      type: "date",
      min: new Date(restUserData.type.min),
      max: new Date(restUserData.type.max),
    };
  }
  return {
    name: restUserData.name,
    label: restUserData.label,
    size: restUserData.size,
    pinned: restUserData.pinned || false,
    ...userdatatype,
  };
}

export function userdataToRest(userData: UserData): UserDataField {
  let userDataType: UserDataType = { type: "text" };
  if (userData.type === "number") {
    userDataType = {
      type: "number",
      min: userData.min || null,
      max: userData.max || null,
    };
  }
  if (userData.type === "date") {
    userDataType = {
      type: "date",
      min: userData.min?.toISOString(),
      max: userData.max?.toISOString(),
    };
  }
  return {
    name: userData.name,
    label: userData.label,
    size: userData.size || "xl", //TODO: properly set
    pinned: userData.pinned || false,
    type: userDataType,
  };
}

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

export function restToStudent(data: StudentResponse): Student {
  const { answers, code } = restToAnswers(data.answers);
  return {
    userData: Object.fromEntries(
      Object.entries(data.data.data).map(([k, v]: [string, RestUserData | undefined]) => {
        if (!v) return [k, undefined];
        return [k, Object.entries(v)[0][1]];
      }),
    ),
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

export function restToContest(data: ContestResponse): Contest {
  return {
    ...data,
    userData: data.userData.map(restToUserdata),
    hasOnline: data.onlineSettings != null,
    contestWindowStart: new Date(data.onlineSettings?.windowRange.start || 0),
    contestWindowEnd: new Date(data.onlineSettings?.windowRange.end || 0),
    hasPdf: data.offlineEnabled,
    allowStudentImport: data.allowStudentAdd,
    duration: Number(data.onlineSettings?.duration || 0),
    allowRestart: data.onlineSettings?.allowRestarts || false,
  };
}

export function restToParticipation(data: Venue): Participation {
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
