import z from "zod";

import { answerSchema } from "~/models/variant";

/**
 * Lifecycle of the student, independent of the participation window. A missing status means
 * `"ongoing"` (students stored before this field existed).
 */
export const studentStatusSchema = z.enum(["ongoing", "submitted"]);
export type StudentStatus = z.infer<typeof studentStatusSchema>;

export const studentSchema = z
  .object({
    uid: z.string(),
    userData: z
      .object({
        surname: z.string(),
        name: z.string(),
      })
      .partial()
      .catchall(z.union([z.string(), z.number(), z.date()])),
    userDataHash: z.string(),

    absent: z.boolean(),
    disabled: z.boolean(),

    venueId: z.string(),
    contestId: z.string(),
    token: z.string(),

    participationWindow: z.strictObject({
      start: z.date(),
      end: z.date(),
    }),

    status: studentStatusSchema,
    /** When the student was explicitly submitted (absent on natural expiry) */
    submittedAt: z.date(),
    /** Who submitted the student */
    submittedBy: z.enum(["student", "teacher"]),

    variantId: z.string(),
    answers: z.record(z.string(), answerSchema),
    score: z.number(),
    extraData: z.record(z.string(), z.any()),
    // Lingua del testo scelta dallo studente
    language: z.string(),

    createdAt: z.coerce.date(),
    updatedAt: z.date(),
  })
  .partial()
  .extend({
    id: z.string(),
  });

export type Student = z.infer<typeof studentSchema>;

export type StudentPhase =
  /** No participation window yet, or the window has not started */
  | "not_started"
  | "ongoing"
  /** Explicitly submitted, by the student or by the teacher */
  | "submitted"
  /** The participation window ended without an explicit submission */
  | "expired";

/**
 * Phase of the student given whether the participation window has started and ended. The window
 * is never modified on submission: it always holds the time allotted to the student.
 */
export function studentPhase(
  student: Pick<Student, "status" | "participationWindow">,
  started: boolean,
  ended: boolean,
): StudentPhase {
  if (!student.participationWindow || !started) return "not_started";
  if (student.status === "submitted") return "submitted";
  if (ended) return "expired";
  return "ongoing";
}

export function getStudentPhase(
  student: Pick<Student, "status" | "participationWindow">,
  now: Date = new Date(),
): StudentPhase {
  const window = student.participationWindow;
  return studentPhase(student, !!window && now >= window.start, !!window && now >= window.end);
}

export function isStudentTerminated(phase: StudentPhase) {
  return phase === "submitted" || phase === "expired";
}
