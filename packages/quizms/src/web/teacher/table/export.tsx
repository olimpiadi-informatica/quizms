import type { RefObject } from "react";

import { saveAs } from "file-saver";
import { unparse as stringifyCSV } from "papaparse";

import { type Contest, formatUserData, type Participation, type Student } from "~/models";
import { useTeacher, useTeacherStudents } from "~/web/teacher/context";

import { canViewScore } from "./utils";

export function ExportModal({ ref }: { ref: RefObject<HTMLButtonElement | null> | null }) {
  const { contest, participation } = useTeacher();
  const [students] = useTeacherStudents();

  return (
    <button
      ref={ref}
      type="button"
      className="hidden"
      onClick={() => exportStudents(students, contest, participation)}
    />
  );
}

function exportStudents(students: Student[], contest: Contest, participation: Participation) {
  const scoreVisible = canViewScore(contest, participation);
  const flatStudents = students
    .filter((student) => !student.disabled)
    .map((student) => {
      return [
        ...contest.userData.map((field) => formatUserData(student, field)),
        ...(contest.hasVariants ? [student.variant] : []),
        ...contest.problemIds.map((id) => student.answers?.[id]),
        ...(scoreVisible ? [student.score] : []),
      ];
    });

  flatStudents.unshift([
    ...contest.userData.map((field) => field.label),
    ...(contest.hasVariants ? ["Variante"] : []),
    ...contest.problemIds,
    ...(scoreVisible ? ["Punteggio"] : []),
  ]);

  const csv = stringifyCSV(flatStudents, {
    skipEmptyLines: true,
    escapeFormulae: true,
  });

  saveAs(new Blob([csv], { type: "text/csv;charset=utf-8" }), `studenti-${contest.id}.csv`);
}
