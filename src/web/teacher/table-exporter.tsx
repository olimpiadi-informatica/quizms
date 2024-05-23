import { Ref, forwardRef } from "react";

import { saveAs } from "file-saver";
import { unparse as stringifyCSV } from "papaparse";

import { Contest, Student, Variant, formatPersonalInformation, score } from "~/models";

import { useTeacher, useTeacherStudents } from "./provider";

const Exporter = forwardRef(function Exporter(_, ref: Ref<HTMLButtonElement> | null) {
  const { contest, variants } = useTeacher();
  const [students] = useTeacherStudents();

  return (
    <button
      ref={ref}
      className="hidden"
      onClick={() => exportStudents(students, contest, variants)}
    />
  );
});

export default Exporter;

function exportStudents(students: Student[], contest: Contest, variants: Record<string, Variant>) {
  const flatStudents = students
    .filter((student) => !student.disabled)
    .map((student) => {
      return [
        ...contest.personalInformation.map((field) => formatPersonalInformation(student, field)),
        ...(contest.hasVariants ? [student.variant] : []),
        ...contest.problemIds.map((id) => student.answers?.[id]),
        student.absent ? "" : score(student, variants),
      ];
    });

  flatStudents.unshift([
    ...contest.personalInformation.map((field) => field.label),
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
