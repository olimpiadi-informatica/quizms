import { type CSSProperties, forwardRef, type Ref, useState } from "react";

import { Form, Modal, SingleFileField, SubmitButton } from "@olinfo/react-components";
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
import { randomId } from "~/utils";
import { useTeacher, useTeacherStudents } from "~/web/teacher/context";

export const ImportModal = forwardRef(function ImportModal(
  _props,
  ref: Ref<HTMLDialogElement> | null,
) {
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
      throw new Error(`Errore nella riga ${row + 1}: Troppi pochi campi`);
    }

    const userData: Student["userData"] = {};
    for (const [i, field] of contest.userData.entries()) {
      try {
        userData[field.name] = parseUserData(record[i], field, {
          dateFormat: "dd/MM/yyyy",
        });
      } catch (err) {
        throw new Error(`Errore nella riga ${row + 1}: ${(err as Error).message}`, { cause: err });
      }
    }

    const off = contest.userData.length + Number(contest.hasVariants || 0);
    const variantId = contest.hasVariants ? record[off - 1] : Object.values(variants)[0].id;
    const rawAnswers = record.slice(off);
    let answers: Student["answers"] = {};

    if (variantId) {
      const variant = variants[variantId];
      if (!variant) {
        throw new Error(`Errore nella riga ${row + 1}: La variante "${variantId}" non è valida`);
      }
      answers = Object.fromEntries(
        contest.problemIds.map((id, i) => [id, parseAnswer(rawAnswers[i], variant.schema[id])]),
      );
    } else if (rawAnswers.some(Boolean)) {
      throw new Error(`Errore nella riga ${row + 1}: Variante mancante`);
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
    students.push(student);
  }
  await Promise.all(students.map((student) => addStudent(student)));
}
