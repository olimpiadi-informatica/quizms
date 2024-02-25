import React, { Ref, forwardRef } from "react";

import { saveAs } from "file-saver";
import { unparse as stringifyCSV } from "papaparse";

import { Contest, Student, formatPersonalInformation } from "~/models";

import { useTeacher, useTeacherStudents } from "./provider";

const Exporter = forwardRef(function Exporter(_, ref: Ref<HTMLButtonElement> | null) {
  const { contest } = useTeacher();
  const [students] = useTeacherStudents();

  return <button ref={ref} className="hidden" onClick={() => exportStudents(students, contest)} />;
});

export default Exporter;

function exportStudents(students: Student[], contest: Contest) {
  const flatStudents = students.map((student) => {
    return [
      ...contest.personalInformation.map((field) =>
        formatPersonalInformation(student, field, { dateStyle: "short" }),
      ),
      ...(contest.hasVariants ? [student.variant] : []),
      ...contest.problemIds.map((id) => student.answers?.[id]),
    ];
  });

  flatStudents.unshift([
    ...contest.personalInformation.map((field) => field.label),
    ...(contest.hasVariants ? ["Variante"] : []),
    ...contest.problemIds,
  ]);

  const csv = stringifyCSV(flatStudents, {
    skipEmptyLines: true,
    escapeFormulae: true,
  });

  saveAs(new Blob([csv], { type: "text/csv;charset=utf-8" }), `studenti-${contest.id}.csv`);
}
