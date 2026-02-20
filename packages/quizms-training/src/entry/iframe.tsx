import { type Student, studentSchema } from "@olinfo/quizms/models";
import { validate } from "@olinfo/quizms/utils";
import z from "zod";

export async function getStudentIframe([_, contestId]: [string, string]): Promise<Student | null> {
  if (window.parent === window) return null;

  const messageId = crypto.randomUUID();
  window.parent.postMessage({
    messageId,
    type: "getStudent",
    contestId,
  });

  return await getResponse(messageId);
}

export async function setAnswersIframe(student: Student): Promise<Student | null> {
  if (window.parent === window) return null;

  const messageId = crypto.randomUUID();
  window.parent.postMessage({
    messageId,
    type: "setAnswers",
    contestId: student.contestId,
    answers: student.answers,
  });

  return await getResponse(messageId);
}

export async function startIframe(student: Student): Promise<Student | null> {
  if (window.parent === window) return null;

  const messageId = crypto.randomUUID();
  window.parent.postMessage({
    messageId,
    type: "start",
    contestId: student.contestId,
  });
  return await getResponse(messageId);
}

export async function submitIframe(student: Student): Promise<Student | null> {
  if (window.parent === window) return null;

  const messageId = crypto.randomUUID();
  window.parent.postMessage({
    messageId,
    type: "submit",
    contestId: student.contestId,
  });

  return await getResponse(messageId);
}

export async function resetIframe(student: Student): Promise<Student | null> {
  if (window.parent === window) return null;

  const messageId = crypto.randomUUID();
  window.parent.postMessage({
    messageId,
    type: "reset",
    contestId: student.contestId,
  });

  return await getResponse(messageId);
}

async function getResponse(messageId: string) {
  const controller = new AbortController();
  const student = await new Promise<Student | null>((resolve, reject) => {
    window.addEventListener(
      "message",
      (ev) => {
        try {
          const data = validate(messageSchema, ev.data);
          if (data.messageId !== messageId) return;

          if (!data.success) {
            reject(new Error(data.error));
          } else if (data.data) {
            resolve(data.data);
          } else {
            resolve(null);
          }
        } catch (err) {
          reject(err);
        }
      },
      { signal: controller.signal },
    );
  });
  controller.abort();
  return student;
}

const messageSchema = z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
    messageId: z.string(),
    data: studentSchema.nullable(),
  }),
  z.object({
    success: z.literal(false),
    messageId: z.string(),
    error: z.string(),
  }),
]);
