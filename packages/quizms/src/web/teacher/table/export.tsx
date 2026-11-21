import type { RefObject } from "react";

import { msg } from "@lingui/core/macro";
import { saveAs } from "file-saver";
import { unparse as stringifyCSV } from "papaparse";

import { type I18n, useLingui } from "~/i18n";
import { type Contest, formatUserData, type Student, type Venue } from "~/models";
import { useTeacher, useTeacherStudents } from "~/web/teacher/context";

import { canViewScore } from "./utils";

export function ExportModal({ ref }: { ref: RefObject<HTMLButtonElement | null> | null }) {
  const { contest, venue } = useTeacher();
  const [students] = useTeacherStudents();
  const { i18n } = useLingui();

  return (
    <button
      ref={ref}
      type="button"
      className="hidden"
      onClick={() => exportStudents(students, contest, venue, i18n)}
    />
  );
}

function exportStudents(students: Student[], contest: Contest, venue: Venue, i18n: I18n) {
  const scoreVisible = canViewScore(contest, venue);
  const flatStudents = students
    .filter((student) => !student.disabled)
    .map((student) => {
      return [
        ...contest.userData.map((field) => formatUserData(student, field)),
        ...(contest.hasVariants ? [student.variantId] : []),
        ...contest.problemIds.map((id) => student.answers?.[id]),
        ...(scoreVisible ? [student.score] : []),
      ];
    });

  flatStudents.unshift([
    ...contest.userData.map((field) => field.label),
    ...(contest.hasVariants ? [i18n._(msg`Variant`)] : []),
    ...contest.problemIds,
    ...(scoreVisible ? [i18n._(msg`Score`)] : []),
  ]);

  const csv = stringifyCSV(flatStudents, {
    skipEmptyLines: true,
    escapeFormulae: true,
  });

  const contestId = contest.id;
  saveAs(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
    i18n._(msg`students-${contestId}.csv`),
  );
}
