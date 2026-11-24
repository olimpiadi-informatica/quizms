import z from "zod";

import { answerSchema } from "~/models/variant";

/**
 * Lifecycle of the student, independent of the participation window. A missing status means
 * `"ongoing"` (students stored before this field existed). `pending_approval` is used only in
 * contests whose `terminationMode` is `teacher_approval`.
 */
export const studentStatusSchema = z.enum(["ongoing", "pending_approval", "submitted"]);
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
    /** When the student requested the submission (`teacher_approval` mode) */
    terminationRequestedAt: z.date(),

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
  /** Waiting for the teacher to approve the submission: the answers are locked */
  | "pending_approval"
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
  // A request still pending when the window ends is just a finished student.
  if (ended) return "expired";
  if (student.status === "pending_approval") return "pending_approval";
  return "ongoing";
}

export function getStudentPhase(
  student: Pick<Student, "status" | "participationWindow">,
  now: Date = new Date(),
): StudentPhase {
  const window = student.participationWindow;
  return studentPhase(student, !!window && now >= window.start, !!window && now >= window.end);
}

/** Whether the student can no longer change the answers (finished or waiting for approval). */
export function isStudentLocked(phase: StudentPhase) {
  return isStudentTerminated(phase) || phase === "pending_approval";
}

export function isStudentTerminated(phase: StudentPhase) {
  return phase === "submitted" || phase === "expired";
}
