import { type Student, studentSchema } from "@olinfo/quizms/models";
import { validate } from "@olinfo/quizms/utils";
import z from "zod";

export async function getIframeStudent([_, contestId]: [string, string]): Promise<Student | null> {
  if (window.parent === window) return null;

  const controller = new AbortController();
  const messageId = crypto.randomUUID();
  window.parent.postMessage({
    messageId,
    type: "getStudent",
    contestId,
  });

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

export function saveIframeStudent(student: Student) {
  if (window.parent === window) return;

  window.parent.postMessage({
    messageId: crypto.randomUUID(),
    type: "setStudent",
    student,
  });
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
