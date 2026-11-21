import { type CSSProperties, type RefObject, useState } from "react";

import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Form, Modal, SingleFileField, SubmitButton } from "@olinfo/react-components";
import { Upload } from "lucide-react";
import { parse as parseCSV } from "papaparse";

import type { I18n } from "~/i18n";
import {
  type Contest,
  calcScore,
  parseAnswer,
  parseUserData,
  type Student,
  type Variant,
  type Venue,
  validateAnswerValue,
  validateUserData,
} from "~/models";
import { randomId } from "~/utils";
import { useTeacher, useTeacherStudents } from "~/web/teacher/context";

export function ImportModal({ ref }: { ref: RefObject<HTMLDialogElement | null> }) {
  const { t, i18n } = useLingui();
  const { contest, venue } = useTeacher();

  const labels = contest.userData.map((field) => field.label);
  if (contest.hasVariants) {
    labels.push(t`Variant`);
  }
  labels.push(...contest.problemIds);

  const dates = contest.userData
    .filter((field) => field.type === "date")
    .map((field) => field.label.toLowerCase());

  const { variants } = useTeacher();
  const [, setStudent] = useTeacherStudents();

  const [uploadCount, setUploadCount] = useState(0);

  const fields = dates.join(", ");
  const year = new Date().getFullYear();

  const submit = async ({ file }: { file: File }) => {
    setUploadCount((count) => count + 1);
    try {
      const text = await file.text();
      await importStudents(text, contest, variants, venue, setStudent, i18n);
    } finally {
      ref.current?.close();
    }
  };

  return (
    <Modal ref={ref} title={t`Import students`}>
      <div className="prose">
        <p>
          <Trans>
            Import the students from a file. The file must be in <b>CSV</b> format, and the first
            row must contain the header. <b>Do not</b> leave empty rows before the header or empty
            columns before the data.
          </Trans>
        </p>
        <p>
          <Trans>
            If you are using Excel, you can create a CSV file by going to “<i>Save As</i>” and
            choosing “<i>CSV (Comma delimited) (*.csv)</i>” as the file format.
          </Trans>
        </p>
        <p>
          <Trans>The columns must be in the following order:</Trans>
        </p>
        <div className="overflow-auto bg-base-content">
          <div
            className="grid grid-cols-[auto_repeat(var(--cols1),auto)_repeat(var(--cols2),1fr)] grid-rows-[auto_1fr_1fr] w-min border-2 border-base-content gap-0.5 *:p-1 *:bg-base-100"
            style={
              {
                "--cols1": labels.length - contest.problemIds.length,
                "--cols2": contest.problemIds.length,
              } as CSSProperties
            }>
            <div />
            {labels.map((_, i) => (
              <div key={i} className="text-center text-sm text-base-content/60">
                {columnName(i)}
              </div>
            ))}
            <div className="text-center text-sm text-base-content/60 flex items-center">1</div>
            {labels.map((label) => (
              <div key={label}>{label}</div>
            ))}
            <div className="text-center text-sm text-base-content/60 flex items-center">2</div>
            {labels.map((label) => (
              <div key={label} />
            ))}
          </div>
        </div>
        <p>
          {contest.hasVariants ? (
            <Trans>
              To allow entering the personal data before the contest, the <b>Variant</b> column and
              the answer columns can be left blank. They will still have to be filled in to
              finalize.
            </Trans>
          ) : (
            <Trans>
              To allow entering the personal data before the contest, the answer columns can be left
              blank. They will still have to be filled in to finalize.
            </Trans>
          )}
        </p>
        {dates.length > 0 && (
          <p>
            <Trans>
              The fields <b>{fields}</b> must be in the{" "}
              <span className="whitespace-nowrap font-bold">dd/mm/yyyy</span> format, for example{" "}
              <span className="whitespace-nowrap">14/03/{year}</span>.
            </Trans>
          </p>
        )}
        <Form onSubmit={submit} className="!max-w-full">
          <SingleFileField key={uploadCount} field="file" label={t`CSV file`} accept="text/csv" />
          <SubmitButton icon={Upload}>
            <Trans>Import</Trans>
          </SubmitButton>
        </Form>
      </div>
    </Modal>
  );
}

function columnName(index: number): string {
  const name = String.fromCharCode(65 + (index % 26));
  if (index < 26) {
    return name;
  }
  return columnName(Math.floor(index / 26) - 1) + name;
}

async function importStudents(
  file: string,
  contest: Contest,
  variants: Record<string, Variant>,
  venue: Venue,
  addStudent: (student: Student) => Promise<void>,
  i18n: I18n,
) {
  const records = parseCSV<string[]>(file, {
    skipEmptyLines: "greedy",
  });
  if (records.errors?.length) {
    throw new Error(records.errors[0].message);
  }

  const students: Student[] = [];
  for (let row = 1; row < records.data.length; row++) {
    const record = records.data[row];
    const line = row + 1;
    if (record.length < contest.userData.length) {
      throw new Error(i18n._(msg`Error on row ${line}: Too few fields`));
    }

    const userData: Student["userData"] = {};
    for (const [i, field] of contest.userData.entries()) {
      const value = parseUserData(record[i], field, {
        dateFormat: "dd/MM/yyyy",
      });
      const err = validateUserData(value, field);
      if (err) {
        const error = err[0];
        throw new Error(i18n._(msg`Error on row ${line}: ${error}`));
      }
      if (value != null) {
        userData[field.name] = value;
      }
    }

    const off = contest.userData.length + Number(contest.hasVariants || 0);
    const variantId = contest.hasVariants ? record[off - 1] : Object.values(variants)[0].id;
    const rawAnswers = record.slice(off);
    let answers: Student["answers"] = {};

    if (variantId) {
      const variant = variants[variantId];
      if (!variant) {
        throw new Error(i18n._(msg`Error on row ${line}: Variant "${variantId}" is not valid`));
      }
      answers = Object.fromEntries(
        contest.problemIds
          .map((id, i) => {
            const answer = parseAnswer(rawAnswers[i], variant.schema[id]);
            const err = validateAnswerValue(answer?.value, variant.schema[id]);
            if (err) {
              const error = err[0];
              throw new Error(i18n._(msg`Error on row ${line}: ${error}`));
            }
            return [id, answer];
          })
          .filter(([_, answer]) => answer !== undefined),
      );
    } else if (rawAnswers.some(Boolean)) {
      throw new Error(i18n._(msg`Error on row ${line}: Missing variant`));
    }

    const student: Student = {
      id: randomId(),
      userData,
      contestId: contest.id,
      venueId: venue.id,
      variantId: variantId,
      answers,
      extraData: { imported: true },
      createdAt: new Date(),
      absent: false,
      disabled: false,
    };
    const score = calcScore(student, variants[variantId]?.schema);
    if (score !== undefined) {
      student.score = score;
    }
    students.push(student);
  }
  await Promise.all(students.map((student) => addStudent(student)));
}
