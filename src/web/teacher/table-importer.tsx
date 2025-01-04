import { type CSSProperties, type Ref, forwardRef, useState } from "react";

import { Form, Modal, SingleFileField, SubmitButton } from "@olinfo/react-components";
import { Upload } from "lucide-react";
import { parse as parseCSV } from "papaparse";
import z from "zod";

import {
  type Contest,
  type Participation,
  type Student,
  type Variant,
  calcScore,
  parseUserData,
  studentSchema,
} from "~/models";
import { randomId } from "~/utils/random";
import validate from "~/utils/validate";

import { useTeacher, useTeacherStudents } from "./provider";

const ImportModal = forwardRef(function ImportModal(_props, ref: Ref<HTMLDialogElement> | null) {
  const { contest, participation } = useTeacher();

  const labels = contest.userData.map((field) => field.label);
  if (contest.hasVariants) {
    labels.push("Variante");
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
      await importStudents(text, contest, variants, participation, setStudent);
    } finally {
      if (ref && "current" in ref) {
        ref.current?.close();
      }
    }
  };

  return (
    <Modal ref={ref} title="Importa studenti">
      <div className="prose">
        <p>
          Importa gli studenti da un file. Il file deve essere in formato <b>CSV</b>, la prima riga
          deve contenere l&apos;intestazione. <b>Non</b> lasciare righe vuote prima
          dell&apos;intestazione o colonne vuote prima dei dati.
        </p>
        <p>
          Se stai usando Excel, puoi creare un file CSV andando su &ldquo;<i>Salva con nome</i>
          &rdquo; e scegliendo come formato di file &ldquo;
          <i>Valori separati da una virgola (.csv)</i>&rdquo;.
        </p>
        <p>Le colonne devono essere nel seguente ordine:</p>
        <div className="overflow-auto bg-base-content">
          <div
            className="grid grid-cols-[repeat(var(--cols1),auto)_repeat(var(--cols2),1fr)] grid-rows-2 w-min border-2 border-base-content gap-0.5 *:bg-base-100"
            style={
              {
                "--cols1": labels.length - contest.problemIds.length,
                "--cols2": contest.problemIds.length,
              } as CSSProperties
            }>
            {labels.map((label) => (
              <div key={label} className="ps-1 pe-2">
                {label}
              </div>
            ))}
            {labels.map((label) => (
              <div key={label} />
            ))}
          </div>
        </div>
        <p>
          Per consentire l&apos;inserimento dei dati personali prima della gara,{" "}
          {contest.hasVariants && (
            <>
              la colonna <b>Variante</b> e
            </>
          )}{" "}
          le colonne per le risposte possono essere lasciate in bianco. Per la finalizzazione sarà
          comunque necessario compilarle.
        </p>
        {dates.length > 0 && (
          <p>
            I campi <b>{dates.join(", ")}</b> devono essere nel formato{" "}
            <span className="whitespace-nowrap font-bold">dd/mm/yyyy</span>, ad esempio{" "}
            <span className="whitespace-nowrap">14/03/{new Date().getFullYear()}</span>.
          </p>
        )}
        <Form onSubmit={submit} className="!max-w-full">
          <SingleFileField key={uploadCount} field="file" label="File CSV" accept="text/csv" />
          <SubmitButton icon={Upload}>Importa</SubmitButton>
        </Form>
      </div>
    </Modal>
  );
});

export default ImportModal;

async function importStudents(
  file: string,
  contest: Contest,
  variants: Record<string, Variant>,
  participation: Participation,
  addStudent: (student: Student) => Promise<void>,
) {
  const schema = z
    .array(z.string().trim().max(256))
    .min(contest.userData.length)
    .transform<Student>((value, ctx) => {
      const off = contest.userData.length + Number(contest.hasVariants || 0);
      const variantId = contest.hasVariants ? value[off - 1] : Object.values(variants)[0].id;

      if (variantId) {
        const variant = variants[variantId];
        if (!variant) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [contest.userData.length],
            message: `La variante "${variantId}" non è valida`,
          });
          return z.NEVER;
        }
      } else if (value.slice(contest.userData.length).some(Boolean)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [contest.userData.length],
          message: "Variante mancante",
        });
        return z.NEVER;
      }

      const userData: Student["userData"] = {};
      for (const [i, field] of contest.userData.entries()) {
        try {
          userData[field.name] = parseUserData(value[i], field, {
            dateFormat: "dd/MM/yyyy",
          });
        } catch (err) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [i],
            message: (err as Error).message,
          });
          return z.NEVER;
        }
      }

      const student: Student = {
        id: randomId(),
        userData,
        contestId: contest.id,
        participationId: participation.id,
        variant: variantId,
        answers: Object.fromEntries(contest.problemIds.map((id, i) => [id, value[off + i]])),
        extraData: { imported: true },
        createdAt: new Date(),
        absent: false,
        disabled: false,
      };
      student.score = calcScore(student, variants[variantId]?.schema);
      return student;
    })
    .pipe(studentSchema)
    .array();

  const records = parseCSV(file.slice(file.indexOf("\n") + 1), {
    skipEmptyLines: "greedy",
  });
  if (records.errors?.length) {
    throw new Error(records.errors[0].message);
  }

  const students: Student[] = validate(schema, records.data, { includePath: false });
  await Promise.all(students.map((student) => addStudent(student)));
}
