import { type CSSProperties, forwardRef, type Ref, useState } from "react";

import type { I18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Form, Modal, SingleFileField, SubmitButton } from "@olinfo/react-components";
import { format } from "date-fns";
import { Upload } from "lucide-react";
import { parse as parseCSV } from "papaparse";

import {
  type Contest,
  calcScore,
  type Participation,
  parseAnswer,
  parseUserData,
  type Student,
  type Variant,
} from "~/models";
import { randomId } from "~/utils/random";
import { useTeacher, useTeacherStudents } from "~/web/teacher/context";

const dateFormat: Record<string, string> = {
  it: "dd/MM/yyyy",
  en: "MM/dd/yyyy",
};

export const ImportModal = forwardRef(function ImportModal(
  _props,
  ref: Ref<HTMLDialogElement> | null,
) {
  const { contest, participation } = useTeacher();
  const { t, i18n } = useLingui();

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

  const submit = async ({ file }: { file: File }) => {
    setUploadCount((count) => count + 1);
    try {
      const text = await file.text();
      await importStudents(text, contest, variants, participation, setStudent, i18n);
    } finally {
      if (ref && "current" in ref) {
        ref.current?.close();
      }
    }
  };

  return (
    <Modal ref={ref} title={t`Import students`}>
      <div className="prose">
        <p>
          <Trans>
            Import students from a file. The file must be in <b>CSV</b> format, the first row must
            contain the header. <b>Do not</b> leave empty rows before the header or empty columns
            before the data.
          </Trans>
        </p>
        <p>
          <Trans>
            If you are using Excel, you can create a CSV file by going to &ldquo;<i>Save as</i>
            &rdquo; and choosing &ldquo;<i>Comma separated values (.csv)</i>&rdquo; as the file
            format.
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
              To allow personal data entry before the contest, the <b>Variant</b> column and the
              columns for answers can be left blank. For finalization, it will still be necessary to
              fill them in.
            </Trans>
          ) : (
            <Trans>
              To allow personal data entry before the contest, the columns for answers can be left
              blank. For finalization, it will still be necessary to fill them in.
            </Trans>
          )}
        </p>
        {dates.length > 0 && (
          <p>
            <Trans>
              The fields <b>{dates.join(", ")}</b> must be in the format{" "}
              <span className="whitespace-nowrap font-bold">
                {dateFormat[i18n.locale].toLowerCase()}
              </span>
              , for example{" "}
              <span className="whitespace-nowrap">
                {format(new Date(), dateFormat[i18n.locale])}
              </span>
              .
            </Trans>
          </p>
        )}
        <Form onSubmit={submit} className="!max-w-full">
          <SingleFileField key={uploadCount} field="file" label={t`CSV File`} accept="text/csv" />
          <SubmitButton icon={Upload}>
            <Trans>Import</Trans>
          </SubmitButton>
        </Form>
      </div>
    </Modal>
  );
});

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
  participation: Participation,
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
    if (record.length < contest.userData.length) {
      throw new Error(i18n._(msg`Error in row ${row + 1}: Too few fields`));
    }

    const userData: Student["userData"] = {};
    for (const [i, field] of contest.userData.entries()) {
      try {
        userData[field.name] = parseUserData(record[i], field, i18n, {
          dateFormat: dateFormat[i18n.locale],
        });
      } catch (err) {
        throw new Error(i18n._(msg`Error in row ${row + 1}: ${(err as Error).message}`), {
          cause: err,
        });
      }
    }

    const off = contest.userData.length + Number(contest.hasVariants || 0);
    const variantId = contest.hasVariants ? record[off - 1] : Object.values(variants)[0].id;
    const rawAnswers = record.slice(off);
    let answers: Student["answers"] = {};

    if (variantId) {
      const variant = variants[variantId];
      if (!variant) {
        throw new Error(
          i18n._(msg`Error in row ${row + 1}: The variant "${variantId}" is not valid`),
        );
      }
      answers = Object.fromEntries(
        contest.problemIds.map((id, i) => [
          id,
          parseAnswer(rawAnswers[i], variant.schema[id], i18n._),
        ]),
      );
    } else if (rawAnswers.some(Boolean)) {
      throw new Error(i18n._(msg`Error in row ${row + 1}: Missing variant`));
    }

    const student: Student = {
      id: randomId(),
      userData,
      contestId: contest.id,
      participationId: participation.id,
      variant: variantId,
      answers,
      extraData: { imported: true },
      createdAt: new Date(),
      absent: false,
      disabled: false,
    };
    student.score = calcScore(student, variants[variantId]?.schema);
    console.log(student);
    students.push(student);
  }
  await Promise.all(students.map((student) => addStudent(student)));
}
