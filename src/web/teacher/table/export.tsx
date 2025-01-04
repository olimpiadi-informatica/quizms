import { type Ref, forwardRef } from "react";

import { saveAs } from "file-saver";
import { unparse as stringifyCSV } from "papaparse";

import { type Contest, type Student, formatUserData } from "~/models";
import { useTeacher, useTeacherStudents } from "~/web/teacher/provider";

export const ExportModal = forwardRef(function Exporter(_, ref: Ref<HTMLButtonElement> | null) {
  const { contest } = useTeacher();
  const [students] = useTeacherStudents();

  return (
    <button
      ref={ref}
      type="button"
      className="hidden"
      onClick={() => exportStudents(students, contest)}
    />
  );
});

function exportStudents(students: Student[], contest: Contest) {
  const flatStudents = students
    .filter((student) => !student.disabled)
    .map((student) => {
      return [
        ...contest.userData.map((field) => formatUserData(student, field)),
        ...(contest.hasVariants ? [student.variant] : []),
        ...contest.problemIds.map((id) => student.answers?.[id]),
        student.score ?? "",
      ];
    });

  flatStudents.unshift([
    ...contest.userData.map((field) => field.label),
    ...(contest.hasVariants ? ["Variante"] : []),
    ...contest.problemIds,
    "Punteggio",
  ]);

  const csv = stringifyCSV(flatStudents, {
    skipEmptyLines: true,
    escapeFormulae: true,
  });

  saveAs(new Blob([csv], { type: "text/csv;charset=utf-8" }), `studenti-${contest.id}.csv`);
}
