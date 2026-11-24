import type { RefObject } from "react";

import { msg } from "@lingui/core/macro";
import { saveAs } from "file-saver";
import { unparse as stringifyCSV } from "papaparse";

import { type I18n, useLingui } from "~/i18n";
import {
  type Contest,
  displayAnswer,
  formatUserData,
  getStudentPhase,
  localize,
  type Student,
  type Venue,
} from "~/models";
import { useContentLanguage } from "~/web/components";
import { useTeacher, useTeacherStudents } from "~/web/teacher/context";

import { canViewScore } from "./utils";

export function ExportModal({ ref }: { ref: RefObject<HTMLButtonElement | null> | null }) {
  const { contest, venue } = useTeacher();
  const [students] = useTeacherStudents();
  const { i18n } = useLingui();
  const language = useContentLanguage();

  return (
    <button
      ref={ref}
      type="button"
      className="hidden"
      onClick={() => exportStudents(students, contest, venue, i18n, language)}
    />
  );
}

function exportStudents(
  students: Student[],
  contest: Contest,
  venue: Venue,
  i18n: I18n,
  language: string | undefined,
) {
  const scoreVisible = canViewScore(contest, venue);
  const flatStudents = students
    .filter((student) => !student.disabled)
    .map((student) => {
      return [
        ...contest.userData.map((field) => formatUserData(student, field)),
        ...(contest.hasVariants ? [student.variantId] : []),
        ...contest.problemIds.map((id) => displayAnswer(student.answers?.[id])),
        ...(scoreVisible ? [student.score] : []),
        // The status columns are after the answers, so that the file can still be imported.
        ...(contest.onlineSettings
          ? [
              student.participationWindow ? getStudentPhase(student) : "",
              student.submittedAt?.toISOString() ?? "",
              student.submittedBy ?? "",
            ]
          : []),
      ];
    });

  flatStudents.unshift([
    ...contest.userData.map((field) => localize(field.label, language)),
    ...(contest.hasVariants ? [i18n._(msg`Variant`)] : []),
    ...contest.problemIds,
    ...(scoreVisible ? [i18n._(msg`Score`)] : []),
    ...(contest.onlineSettings
      ? [i18n._(msg`Status`), i18n._(msg`Submitted at`), i18n._(msg`Submitted by`)]
      : []),
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
