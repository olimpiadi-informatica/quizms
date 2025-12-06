import type { Student } from "@olinfo/quizms/models";
import { validate } from "@olinfo/quizms/utils";
import type { Firestore } from "firebase/firestore";
import { getFunctions, type HttpsCallableResult, httpsCallable } from "firebase/functions";
import z, { type ZodObject, type ZodRawShape } from "zod";

const responseSchema = z.discriminatedUnion("success", [
  z.object({ success: z.literal(true), data: z.any() }),
  z.object({ success: z.literal(false), errorCode: z.string(), error: z.string() }),
]);

async function api<Shape extends ZodRawShape>(
  db: Firestore,
  action: string,
  body: any,
  shape: Shape,
): Promise<z.infer<ZodObject<Shape>>> {
  const functions = getFunctions(db.app, window.location.origin);
  const apiCallable = httpsCallable(functions, "api");

  let resp: HttpsCallableResult;
  try {
    resp = await apiCallable({ action, ...body });
  } catch (err: any) {
    throw new Error("Server non raggiungibile", { cause: err });
  }

  const data = validate(responseSchema, resp.data);
  if (!data.success) {
    throw new Error(data.error);
  }
  return validate(z.object(shape), data.data);
}

export function login(db: Firestore, role: string, body: { username: string; password: string }) {
  return api(db, `${role}Login`, body, { token: z.string() });
}

export function studentLogin(
  db: Firestore,
  body: {
    contestId: string;
    token: string;
    userData: Student["userData"];
    extraData: Record<string, any>;
  },
) {
  return api(db, "studentLogin", body, { token: z.string() });
}

export async function startParticipation(db: Firestore, participationId: string) {
  await api(db, "teacherStartParticipation", { participationId }, {});
}

export async function stopParticipation(db: Firestore, participationId: string) {
  await api(db, "teacherStopParticipation", { participationId }, {});
}

export async function finalizeParticipation(db: Firestore, participationId: string) {
  await api(db, "teacherFinalizeParticipation", { participationId }, {});
}
