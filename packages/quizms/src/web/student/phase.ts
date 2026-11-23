import { useIsAfter } from "@olinfo/react-components";

import { type Student, type StudentPhase, studentPhase } from "~/models";

/** Phase of the student, updated when the participation window starts and ends. */
export function useStudentPhase(
  student: Pick<Student, "status" | "participationWindow">,
): StudentPhase {
  const started = useIsAfter(student.participationWindow?.start) ?? false;
  const ended = useIsAfter(student.participationWindow?.end) ?? false;
  return studentPhase(student, started, ended);
}
