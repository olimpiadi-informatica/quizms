import { type Ref, forwardRef } from "react";

import { Form, Modal, SingleFileField, SubmitButton } from "@olinfo/react-components";
import { ArrowUpFromLine } from "lucide-react";
import { parse as parseCSV } from "papaparse";
import z from "zod";

import {
  type Contest,
  type Participation,
  type Student,
  type Variant,
  parsePersonalInformation,
  studentSchema,
} from "~/models";
import { randomId } from "~/utils/random";
import validate from "~/utils/validate";

import { useTeacher, useTeacherStudents } from "./provider";

const ImportModal = forwardRef(function ImportModal(_props, ref: Ref<HTMLDialogElement> | null) {
  const { contest, participation } = useTeacher();

  const labels = contest.personalInformation.map((field) => field.label);

  const dates = contest.personalInformation
    .filter((field) => field.type === "date")
    .map((field) => field.label.toLowerCase());

  const { variants } = useTeacher();
  const [, setStudent] = useTeacherStudents();

  const submit = async ({ file }: { file: File }) => {
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
          Importa gli studenti da un file. Il file deve essere in formato <b>CSV</b> e{" "}
          <b>non deve</b> avere l&apos;intestazione.
        </p>
        <p>
          Se stai usando Excel, puoi creare un file CSV andando su &ldquo;<i>Salva con nome</i>
          &rdquo; e scegliendo come formato di file &ldquo;
          <i>Valori separati da una virgola (.csv)</i>&rdquo;.
        </p>
        <p>Le colonne devono essere, in ordine:</p>
        <p className="flex justify-center rounded-box bg-base-200 px-3 py-2">
          <span>{labels.join(", ")}</span>
        </p>
        <p>
          In aggiunta, è possibile aggiungere{" "}
          {contest.hasVariants && (
            <>
              una colonna <b>Variante</b>, seguita da{" "}
            </>
          )}
          {contest.problemIds.length} colonne per le risposte.
        </p>
        {dates.length > 0 && (
          <p>
            I campi <b>{dates.join(", ")}</b> devono essere nel formato{" "}
            <span className="whitespace-nowrap font-bold">dd/mm/yyyy</span>, ad esempio{" "}
            <span className="whitespace-nowrap">14/03/{new Date().getFullYear()}</span>.
          </p>
        )}
        <Form onSubmit={submit} className="!max-w-full">
          <SingleFileField field="file" label="File CSV" accept="text/csv" />
          <SubmitButton icon={ArrowUpFromLine}>Importa</SubmitButton>
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
    .min(contest.personalInformation.length)
    .transform<Student>((value, ctx) => {
      const off = contest.personalInformation.length + Number(contest.hasVariants || 0);
      const variantId = contest.hasVariants ? value[off - 1] : Object.values(variants)[0].id;

      if (variantId) {
        const variant = variants[variantId];
        if (!variant) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [contest.personalInformation.length],
            message: `La variante ${variantId} non è valida`,
          });
          return z.NEVER;
        }
      } else if (value.slice(contest.personalInformation.length).some(Boolean)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [contest.personalInformation.length],
          message: "Variante mancante",
        });
        return z.NEVER;
      }

      const personalInformation: Student["personalInformation"] = {};
      for (const [i, field] of contest.personalInformation.entries()) {
        const [validated, error] = parsePersonalInformation(value[i], field, {
          dateFormat: "dd/MM/yyyy",
        });
        if (error) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [i],
            message: error,
          });
          return z.NEVER;
        }
        personalInformation[field.name] = validated;
      }

      return {
        id: randomId(),
        personalInformation,
        contestId: contest.id,
        participationId: participation.id,
        variant: variantId,
        answers: Object.fromEntries(contest.problemIds.map((id, i) => [id, value[off + i]])),
        extraData: { imported: true },
        createdAt: new Date(),
        absent: false,
        disabled: false,
      } as Student;
    })
    .pipe(studentSchema)
    .array();

  const records = parseCSV(file, {
    skipEmptyLines: "greedy",
  });
  if (records.errors?.length) {
    throw new Error(records.errors[0].message);
  }

  const students: Student[] = validate(schema, records.data);
  await Promise.all(students.map((student) => addStudent(student)));
}
