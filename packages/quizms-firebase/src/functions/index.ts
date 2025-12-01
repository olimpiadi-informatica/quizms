import * as crypto from "node:crypto";

import type { Contest, Participation, Student } from "@olinfo/quizms/models";
import { randomToken } from "@olinfo/quizms/utils";
import { addMinutes, addSeconds, isFuture, isPast, roundToNearestMinutes } from "date-fns";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import type { CallableRequest } from "firebase-functions/https";
import * as logger from "firebase-functions/logger";

import {
  contestConverter,
  participationConverter,
  studentConverter,
} from "~/cli/utils/converters-admin";

initializeApp();
const db = getFirestore();
const auth = getAuth();

type MaybePromise<T> = T | Promise<T>;

type EndpointSuccess<Res> = { success: true; data: Res };
type EndpointError = { success: false; errorCode: string; error: string };

type Endpoint<Req = any, Res = any> = (
  request: CallableRequest<Req>,
) => MaybePromise<EndpointSuccess<Res> | EndpointError>;

async function checkDuplicatedStudents(
  participationId: string,
  token: string,
  userData: NonNullable<Student["userData"]>,
) {
  const snapshot = await db
    .collection(`participations/${participationId}/students`)
    .withConverter(studentConverter)
    .where("userData.name", "==", userData.name)
    .where("userData.surname", "==", userData.surname)
    .where("userData.classYear", "==", userData.classYear)
    .where("userData.classSection", "==", userData.classSection)
    .where("token", "==", token)
    .get();
  return snapshot.docs[0];
}

const studentLogin: Endpoint = async (request) => {
  logger.info("Student login request received", { data: request.data });

  const snapshot = await db
    .collection("participations")
    .withConverter(participationConverter)
    .where("token", "==", request.data.token)
    .get();
  if (snapshot.empty) {
    return { success: false, errorCode: "INVALID_TOKEN", error: "Invalid token" };
  }
  const participationId = snapshot.docs[0].id;
  const participation = snapshot.docs[0].data();

  if (participation.contestId !== request.data.contestId) {
    return {
      success: false,
      errorCode: "TOKEN_CONTEST_MISMATCH",
      error: "Token does not belong to this contest",
    };
  }

  const uid = crypto.randomUUID();

  const duplicatedStudent = await checkDuplicatedStudents(
    participationId,
    request.data.token,
    request.data.userData,
  );
  if (duplicatedStudent) {
    const studentId = duplicatedStudent.id;
    const participationId = duplicatedStudent.data().participationId;
    const variant = duplicatedStudent.data().variant;

    await db.doc(`studentRestores/${uid}`).set({
      studentId,
      participationId,
      token: request.data.token,
      name: request.data.userData.name,
      surname: request.data.userData.surname,
      approvalCode: Math.round(Math.random() * 1000),
      status: "pending",
      createdAt: Timestamp.now(),
    });

    const token = await auth.createCustomToken(uid, {
      role: "student",
      studentId,
      participationId,
      variant,
    });
    return { success: true, data: { token } };
  }

  const variant = "300"; // TODO

  // TODO: validate
  const userData = {
    ...request.data.userData,
    birthDate: request.data.userData.birthDate ? new Date(request.data.userData.birthDate) : null,
  };

  const studentRef = await db.collection(`participations/${participationId}/students`).add({
    uid,
    userData,

    absent: false,
    disabled: false,

    participationId,
    contestId: request.data.contestId,
    token: request.data.token,
    startedAt: participation.startingTime,
    finishedAt: participation.endingTime,

    variant: variant,
    answers: {},
    extraData: {}, // TODO

    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  const token = await auth.createCustomToken(uid, {
    role: "student",
    studentId: studentRef.id,
    participationId,
    variant,
  });
  return { success: true, data: { token } };
};

const teacherLogin: Endpoint = async (request) => {
  logger.info("Teacher login request received", { data: request.data });

  const snapshot = await db
    .collection("users")
    .where("username", "==", request.data.username)
    .get();

  if (snapshot.empty) {
    return { success: false, errorCode: "USER_NOT_FOUND", error: "User not found" };
  }

  const doc = snapshot.docs[0];
  const user = doc.data();

  if (user.role !== "teacher") {
    return { success: false, errorCode: "INVALID_ROLE", error: "User is not a teacher" };
  }
  if (user.password !== request.data.password) {
    return { success: false, errorCode: "INVALID_PASSWORD", error: "Wrong password" };
  }
  const token = await auth.createCustomToken(crypto.randomUUID(), {
    role: "teacher",
    schoolId: doc.id,
  });
  return { success: true, data: { token } };
};

async function getParticipation(
  request: CallableRequest,
  onlineOnly: boolean,
): Promise<[EndpointError] | [null, Participation, Contest]> {
  const participationId = request.data.participationId;

  const snapshot = await db
    .doc(`participations/${participationId}`)
    .withConverter(participationConverter)
    .get();
  if (!snapshot.exists) {
    return [
      { success: false, errorCode: "PARTICIPATION_NOT_FOUND", error: "Participation not found" },
    ];
  }

  const participation = snapshot.data()!;
  if (participation.schoolId !== request.auth?.token.schoolId) {
    return [
      {
        success: false,
        errorCode: "FORBIDDEN",
        error: "You don't have permission to access this participation",
      },
    ];
  }

  const contestSnapshot = await db
    .doc(`contests/${participation.contestId}`)
    .withConverter(contestConverter)
    .get();
  const contest = contestSnapshot.data()!;
  if (onlineOnly) {
    if (!contest.hasOnline) {
      return [{ success: false, errorCode: "CONTEST_OFFLINE", error: "Contest is not online" }];
    }
    if (isFuture(contest.contestWindowStart)) {
      return [
        { success: false, errorCode: "CONTEST_NOT_STARTED", error: "Contest has not started yet" },
      ];
    }
    if (isPast(contest.contestWindowEnd)) {
      return [{ success: false, errorCode: "CONTEST_ENDED", error: "Contest has already ended" }];
    }
  }

  return [null, participation, contest];
}

const teacherStartParticipation: Endpoint = async (request) => {
  logger.info("Teacher start participation received", { data: request.data });

  const [error, participation, contest] = await getParticipation(request, true);
  if (error) {
    return error;
  }

  if (
    participation.endingTime != null &&
    contest.hasOnline &&
    (isFuture(participation.endingTime) || !contest.allowRestart)
  ) {
    return {
      success: false,
      errorCode: "PARTICIPATION_ALREADY_STARTED",
      error: "Participation has already been started",
    };
  }

  const startingTime = roundToNearestMinutes(addSeconds(Date.now(), 3.5 * 60));
  const endingTime = addMinutes(startingTime, contest.hasOnline ? contest.duration : 0);

  await db.doc(`participations/${participation.id}`).update({
    token: await randomToken(), // TODO: controllare duplicati
    startingTime: startingTime,
    endingTime: endingTime,
  });

  return { success: true, data: {} };
};

const teacherStopParticipation: Endpoint = async (request) => {
  logger.info("Teacher stop participation received", { data: request.data });

  const [error, participation] = await getParticipation(request, true);
  if (error) {
    return error;
  }

  if (participation.startingTime == null) {
    return {
      success: false,
      errorCode: "PARTICIPATION_NOT_STARTED",
      error: "Participation has not been started",
    };
  }

  if (isPast(participation.startingTime)) {
    return {
      success: false,
      errorCode: "PARTICIPATION_ALREADY_STARTED",
      error: "Participation has already been started",
    };
  }

  await db.doc(`participations/${participation.id}`).update({
    token: null,
    startingTime: null,
    endingTime: null,
  });

  return { success: true, data: {} };
};

const teacherFinalizeParticipation: Endpoint = async (request) => {
  logger.info("Teacher finalize participation received", { data: request.data });

  const [error, participation] = await getParticipation(request, false);
  if (error) {
    return error;
  }

  await db.doc(`participations/${participation.id}`).update({ finalized: true });

  return { success: true, data: {} };
};

export default async function handler(request: CallableRequest) {
  logger.info(`Received request for action: ${request.data.action}`);
  try {
    switch (request.data.action) {
      case "studentLogin":
        return await studentLogin(request);
      case "teacherLogin":
        return await teacherLogin(request);
      case "teacherStartParticipation":
        return await teacherStartParticipation(request);
      case "teacherStopParticipation":
        return await teacherStopParticipation(request);
      case "teacherFinalizeParticipation":
        return await teacherFinalizeParticipation(request);
      default:
        return { success: false, errorCode: "UNKNOWN_ACTION", error: "Unknown action" };
    }
  } catch (error) {
    logger.error("Error processing request", error);
    return { success: false, errorCode: "INTERNAL_ERROR", error: "An internal error occurred" };
  }
}
