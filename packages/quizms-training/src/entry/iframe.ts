import { type Contest, type Student, studentSchema } from "@olinfo/quizms/models";
import { validate } from "@olinfo/quizms/utils";
import { cloneDeepWith, isDate } from "lodash-es";
import z from "zod";

export async function getTitleIframe(): Promise<string> {
  if (window.parent === window) return "Quizms";

  for (let i = 0; i < 50; i++) {
    try {
      return await getResponse({ type: "getTitle" }, z.string(), 200);
    } catch {}
  }
  throw new Error("Failed to connect");
}

export async function getStudentIframe([_, contestId]: [string, string]): Promise<Student | null> {
  if (window.parent === window) return null;
  return await getResponse({ type: "getStudent", contestId }, studentSchema.nullable());
}

export async function setAnswersIframe(
  student: Student,
  contest: Contest,
): Promise<Student | null> {
  if (window.parent === window) return null;

  return await getResponse(
    {
      type: "setAnswers",
      contestId: contest.id,
      answers: student.answers,
    },
    studentSchema,
  );
}

export async function startIframe(student: Student, contest: Contest): Promise<Student | null> {
  if (window.parent === window) return null;

  return await getResponse(
    {
      type: "start",
      contestId: contest.id,
      variantId: student.variantId,
      duration: contest.onlineSettings?.duration ?? 0,
    },
    studentSchema,
  );
}

export async function submitIframe(_student: Student, contest: Contest): Promise<Student | null> {
  if (window.parent === window) return null;
  return await getResponse({ type: "submit", contestId: contest.id }, studentSchema);
}

export async function resetIframe(_student: Student, contest: Contest): Promise<Student | null> {
  if (window.parent === window) return null;
  return await getResponse({ type: "reset", contestId: contest.id }, studentSchema);
}

export async function logoutIframe(): Promise<null> {
  if (window.parent === window) return null;
  return await getResponse({ type: "logout" }, z.null());
}

async function getResponse<Message extends { type: string }, Data>(
  message: Message,
  schema: z.ZodType<Data>,
  timeout = 10_000,
): Promise<Data> {
  const messageId = crypto.randomUUID();

  const controller = new AbortController();
  const responsePromise = new Promise<Data>((resolve, reject) => {
    window.addEventListener(
      "message",
      (ev) => {
        try {
          const response = validate(
            messageSchema,
            cloneDeepWith(ev.data, (value) => (isDate(value) ? new Date(value) : undefined)),
          );
          if (response.messageId !== messageId) return;

          if (response.success) {
            resolve(validate(schema, response.data));
          } else {
            reject(new Error(response.error));
          }
        } catch (err) {
          reject(err);
        }
      },
      { signal: controller.signal },
    );
  });

  window.parent.postMessage({ ...message, messageId }, "*");

  try {
    const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(), timeout));
    return await Promise.race([responsePromise, timeoutPromise]);
  } finally {
    controller.abort();
  }
}

const messageSchema = z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
    messageId: z.string(),
    data: z.any(),
  }),
  z.object({
    success: z.literal(false),
    messageId: z.string(),
    error: z.string(),
  }),
]);
