import React, { Ref, forwardRef, useRef, useState } from "react";

import { parse as parseDate } from "date-fns";
import { ArrowUpFromLine } from "lucide-react";
import { parse as parseCSV } from "papaparse";
import z from "zod";

import { Contest } from "~/models/contest";
import { School } from "~/models/school";
import { Student, studentSchema } from "~/models/student";
import { Variant } from "~/models/variant";
import Modal from "~/ui/components/modal";
import { useTeacher } from "~/ui/teacher/provider";
import { randomId } from "~/utils/random";
import validate from "~/utils/validate";

const ImportModal = forwardRef(function ImportModal(
  {
    contest,
    school,
  }: {
    contest: Contest;
    school: School;
  },
  ref: Ref<HTMLDialogElement> | null,
) {
  const inputRef = useRef<HTMLInputElement>(null);

  const labels = contest.personalInformation.map((field) => field.label);

  const dates = contest.personalInformation
    .filter((field) => field.type === "date")
    .map((field) => field.label.toLowerCase());

  const [file, setFile] = useState<string>();
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(false);

  const { variants, setStudent } = useTeacher();

  const onChange = async (file?: File) => {
    setError(undefined);
    try {
      const text = await file?.text();
      setFile(text);
    } catch (e) {
      setError(e as Error);
    }
  };

  const onClick = async () => {
    setError(undefined);
    setLoading(true);
    try {
      await importStudents(file ?? "", contest, variants, school, setStudent);
      if (ref && "current" in ref) {
        ref.current?.close();
      }
    } catch (e) {
      setFile(undefined);
      setError(e as Error);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
    setLoading(false);
  };

  return (
    <Modal ref={ref} title="Importa studenti">
      <div className="prose">
        <p>
          Importa gli studenti da un file. Il file deve essere in formato <b>CSV</b> e le colonne
          devono essere, in ordine:
        </p>
        <p className="flex justify-center rounded-box bg-base-200 px-3 py-2">
          <span>{labels.join(", ")}</span>
        </p>
        <p>
          In aggiunta, è possibile aggiungere una colonna <b>Variante</b>, seguita da{" "}
          {contest.problemIds.length} colonne per le risposte.
        </p>
        <p>
          I campi <b>{dates.length > 0 && dates.join(", ")}</b> devono essere nel formato{" "}
          <span className="whitespace-nowrap font-bold">DD/MM/YYYY</span>, ad esempio{" "}
          <span className="whitespace-nowrap">14/03/2023</span>.
        </p>
        <div className="mt-5 flex flex-col items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            className="file-input file-input-bordered file-input-primary max-w-full"
            accept="text/csv"
            onChange={(e) => onChange(e.target.files?.[0])}
          />
          <button className="btn btn-primary" type="button" onClick={onClick} disabled={!file}>
            {loading && <span className="loading loading-spinner" />}
            {!loading && <ArrowUpFromLine />}
            Importa
          </button>
        </div>
        <div className="text-error">{error?.message}</div>
      </div>
    </Modal>
  );
});

export default ImportModal;

async function importStudents(
  file: string,
  contest: Contest,
  variants: Variant[],
  school: School,
  addStudent: (student: Student) => Promise<void>,
) {
  const schema = z
    .array(z.string().trim())
    .min(contest.personalInformation.length)
    .transform<Student>((value, ctx) => {
      const variantId = value[contest.personalInformation.length];

      if (variantId) {
        const variant = variants.find((v) => v.id === variantId && v.contest === contest.id);
        if (!variant) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [contest.personalInformation.length],
            message: `La variante ${variantId} non è valida`,
          });
          return z.NEVER;
        }
      } else if (value.slice(contest.personalInformation.length).some((v) => v)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [contest.personalInformation.length],
          message: `Variante mancante`,
        });
        return z.NEVER;
      }

      return {
        id: randomId(),
        personalInformation: Object.fromEntries(
          contest.personalInformation.map((field, i) => {
            if (field.type === "date") {
              return [
                field.name,
                value[i] ? parseDate(value[i], "dd/MM/yyyy", new Date()) : undefined,
              ];
            }
            if (field.type === "number") {
              return [field.name, value[i] ? Number(value[i]) : undefined];
            }
            return [field.name, value[i].trim()];
          }),
        ),
        contest: contest.id,
        school: school.id,
        variant: variantId,
        answers: Object.fromEntries(
          contest.problemIds.map((id, i) => [
            id,
            value[contest.personalInformation.length + 1 + i],
          ]),
        ),
        createdAt: new Date(),
      };
    })
    .pipe(studentSchema)
    .array();

  const records = parseCSV(file, {
    skipEmptyLines: true,
  });
  if (records.errors?.length) {
    throw new Error(records.errors[0].message);
  }

  const students: Student[] = validate(schema, records.data);
  await Promise.all(students.map((student) => addStudent(student)));
}
