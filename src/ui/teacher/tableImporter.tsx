import React, { Ref, forwardRef, useRef, useState } from "react";

import { times } from "lodash-es";
import { ArrowUpFromLine } from "lucide-react";
import { parse } from "papaparse";
import z, { ZodTypeAny } from "zod";

import { studentConverter } from "~/firebase/converters";
import { useCollection } from "~/firebase/hooks";
import { Contest } from "~/models/contest";
import { School } from "~/models/school";
import { Student, studentSchema } from "~/models/student";
import { Variant } from "~/models/variant";
import Modal from "~/ui/components/modal";
import validate from "~/utils/validate";

const ImportModal = forwardRef(function ImportModal(
  { contest, variants, school }: { contest: Contest; variants: Variant[]; school: School },
  ref: Ref<HTMLDialogElement> | null,
) {
  const inputRef = useRef<HTMLInputElement>(null);

  const fields = contest.personalInformation.map((field) => field.label);
  fields.push("Variante");

  const dates = contest.personalInformation
    .filter((field) => field.type === "date")
    .map((field) => field.label.toLowerCase());

  const [file, setFile] = useState<string>();
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(false);

  const [, addStudent] = useCollection("students", studentConverter, {
    constraints: {
      school: school.id,
      contest: contest.id,
    },
    orderBy: "createdAt",
  });

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
      await importStudents(file ?? "", contest, variants, school, addStudent);
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
      Importa gli studenti da un file. Il file deve essere in formato <b>CSV</b> e le colonne devono
      essere, in ordine:
      <div className="my-1 flex justify-center rounded-box bg-base-200 px-3 py-2">
        <p>{fields.join(", ")}</p>
      </div>
      Seguite da {contest.questionCount} colonne per le risposte. <br />I campi{" "}
      <b>{dates.length > 0 && dates.join(", ")}</b> devono essere nel formato{" "}
      <span className="whitespace-nowrap font-bold">YYYY-MM-DD</span>.
      <div className="mx-5 mt-5 flex flex-col items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          className="file-input file-input-bordered file-input-primary"
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
  const personalInformation = contest.personalInformation.map((field): ZodTypeAny => {
    if (field.type == "text") {
      return z.string();
    } else if (field.type == "number") {
      return z.coerce.number();
    } else if (field.type == "date") {
      return z.coerce.date().min(new Date("1900-01-01"));
    }
    return z.any();
  });

  const schema = z
    .tuple([
      ...(personalInformation as [ZodTypeAny, ...ZodTypeAny[]]),
      z.enum(
        variants.filter((v) => v.contest == contest.id).map((v) => v.id) as [string, ...string[]],
      ),
      ...times(contest.questionCount, () => z.any()),
    ])
    .transform((value) => ({
      id: window.crypto.randomUUID(),
      personalInformation: Object.fromEntries(
        contest.personalInformation.map((field, i) => [field.name, value[i]]),
      ),
      contest: contest.id,
      school: school.id,

      variant: value[contest.personalInformation.length],
      answers: value.slice(contest.personalInformation.length + 1),

      createdAt: new Date(),
    }))
    .pipe(studentSchema)
    .array();

  const records = parse(file, {
    skipEmptyLines: true,
  });
  if (records.errors?.length) {
    throw new Error(records.errors[0].message);
  }

  const students: Student[] = validate(schema, records.data);
  await Promise.all(students.map((student) => addStudent(student)));
}
