import React, { Ref, forwardRef, useMemo, useRef, useState } from "react";

import { format as formatDate } from "date-fns";
import { ArrowUpFromLine } from "lucide-react";
import { parse as parseCSV } from "papaparse";
import z from "zod";

import { Contest, parsePersonalInformation } from "~/models/contest";
import { School } from "~/models/school";
import { Student, studentSchema } from "~/models/student";
import { SchemaDoc } from "~/models/variant";
import { randomId } from "~/utils/random";
import validate from "~/utils/validate";

import { Button } from "../components/button";
import Modal from "../components/modal";
import { useTeacher } from "../teacher/provider";

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

  const dateFormat = useMemo(() => {
    return new Intl.DateTimeFormat("it-IT")
      .formatToParts()
      .map((e) => {
        if (e.type === "day") return "dd";
        if (e.type === "month") return "MM";
        if (e.type === "year") return "yyyy";
        return e.value;
      })
      .join("");
  }, []);

  const placeholderDate = useMemo(() => {
    const date = new Date();
    date.setMonth(2);
    date.setDate(14);
    return formatDate(date, dateFormat);
  }, [dateFormat]);

  const [file, setFile] = useState<string>();
  const [error, setError] = useState<Error>();

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
    try {
      await importStudents(file ?? "", contest, variants, school, setStudent, dateFormat);
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
  };

  return (
    <Modal ref={ref} title="Importa studenti">
      <div className="prose">
        <p>
          Importa gli studenti da un file. Il file deve essere in formato <b>CSV</b> e non deve
          avere l&apos;intestazione.
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
            <span className="whitespace-nowrap font-bold">{dateFormat.toUpperCase()}</span>, ad
            esempio <span className="whitespace-nowrap">{placeholderDate}</span>.
          </p>
        )}
        <div className="mt-5 flex flex-col items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            className="file-input file-input-bordered file-input-primary max-w-full"
            accept="text/csv"
            onChange={(e) => onChange(e.target.files?.[0])}
          />
          <Button className="btn-primary" icon={ArrowUpFromLine} onClick={onClick} disabled={!file}>
            Importa
          </Button>
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
  variants: SchemaDoc[],
  school: School,
  addStudent: (student: Student) => Promise<void>,
  dateFormat: string,
) {
  const schema = z
    .array(z.string().trim())
    .min(contest.personalInformation.length)
    .transform<Student>((value, ctx) => {
      const off = contest.personalInformation.length + Number(contest.hasVariants || 0);
      const variantId = contest.hasVariants
        ? value[off - 1]
        : variants.find((v) => v.contest === contest.id && ["1", "2"].includes(v.id))!.id; // TODO: ugly hack

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
            return [field.name, parsePersonalInformation(value[i].trim(), field, { dateFormat })];
          }),
        ),
        contest: contest.id,
        school: school.id,
        variant: variantId,
        answers: Object.fromEntries(contest.problemIds.map((id, i) => [id, value[off + i]])),
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
