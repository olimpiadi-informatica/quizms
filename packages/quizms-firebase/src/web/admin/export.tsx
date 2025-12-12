import { forwardRef, type Ref, useRef } from "react";

import {
  type Answer,
  type Contest,
  calcProblemPoints,
  formatUserData,
  type Student,
  unshuffleAnswer,
  type Variant,
} from "@olinfo/quizms/models";
import { Button, Modal } from "@olinfo/react-components";
import {
  type DocumentSnapshot,
  type Firestore,
  type FirestoreDataConverter,
  getDocs,
} from "firebase/firestore";
import { TriangleAlert } from "lucide-react";

import { useDb } from "~/web/common/base-login";
import query, { type QueryOption } from "~/web/common/query";

import { useAdmin } from "./context";

type Props<T> = {
  label: string;
  description: string;
  collection: string;
  converter: FirestoreDataConverter<T>;
  options: QueryOption<T>;
  suggestedName?: string;
  formatter: (data: T) => string;
  header?: string;
};

export default function Export<T>(props: Props<T>) {
  const ref = useRef<HTMLDialogElement>(null);

  return (
    <>
      <Button className="btn-primary" onClick={() => ref.current?.showModal()}>
        Esporta {props.label}
      </Button>
      <ExportModal ref={ref} {...props} />
    </>
  );
}

const ExportModal = forwardRef(function StudentExportModal(
  {
    label,
    description,
    collection,
    converter,
    options,
    formatter,
    suggestedName,
    header,
  }: Props<any>,
  ref: Ref<HTMLDialogElement>,
) {
  const { contest } = useAdmin();
  const db = useDb();

  const onExport = async () => {
    await saveExport(db, collection, converter, options, formatter, suggestedName, header);
    if (ref && "current" in ref) {
      ref.current?.close();
    }
  };

  return (
    <Modal ref={ref} title={`Esporta ${label}`}>
      {window.showSaveFilePicker === undefined ? (
        <div className="flex items-center gap-3">
          <TriangleAlert size={20} className="flex-none text-warning" />
          <span>
            Il tuo browser non supporta l&apos;esportazione dei dati. Usa un browser Chrome o Edge.
          </span>
        </div>
      ) : (
        <>
          <div>
            Stai per esportare {description} della gara <b>{contest.name}</b>. Questa operazione
            esegue un grande numero di query al database che richiederà del tempo e potrà incidere
            sulla fatturazione del progetto.
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button className="btn-primary" onClick={onExport}>
              Esporta
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
});

export function scoreboradHeader(contest: Contest) {
  const row: string[] = [];
  for (const field of contest.userData) {
    row.push(field.label);
  }
  row.push("Scuola", "Variante");
  for (const problemId of contest.problemIds) {
    row.push(`${problemId}A`, `${problemId}P`);
  }
  row.push("Punteggio");
  return `${row.map((s) => `"${s}"`).join(",")}\n`;
}

// TODO: move logic to @olinfo/quizms
export function scoreboardFormatter(
  contest: Contest,
  variants: Record<string, Variant>,
  student: Student,
) {
  const row: string[] = [];
  for (const field of contest.userData) {
    row.push(formatUserData(student, field));
  }
  row.push(student.participationId?.split("-")[0] ?? "");
  row.push(student.variant ?? "");
  const unshuflledProblems: Record<string, [Answer, number]> = {};
  if (
    student.answers !== undefined &&
    student.variant !== undefined &&
    variants[student.variant] !== undefined
  ) {
    const schema = variants[student.variant].schema;
    for (const problemId in schema) {
      const problem = schema[problemId];
      const originalId = problem.originalId;
      const answer = student.answers[problemId];
      unshuflledProblems[originalId] = [
        unshuffleAnswer(problem, answer) ?? "",
        calcProblemPoints(problem, answer),
      ];
    }
  }
  for (const problemId of contest.problemIds) {
    if (unshuflledProblems[problemId] !== undefined) {
      const [answer, points] = unshuflledProblems[problemId];
      row.push(`${answer}`);
      row.push(`${points}`);
    } else {
      row.push("");
      row.push("");
    }
  }
  row.push(`${student.score ?? ""}`);
  return row.map((s) => `"${s}"`).join(",");
}

async function saveExport<T>(
  db: Firestore,
  collection: string,
  converter: FirestoreDataConverter<T>,
  options: QueryOption<T>,
  formatter: (data: T) => string,
  suggestedName: string | undefined,
  header?: string,
) {
  const handle = await window.showSaveFilePicker({
    suggestedName: suggestedName ?? `${collection}.jsonl`,
  });

  const writableStream = await handle.createWritable();

  if (header !== undefined) {
    await writableStream.write(header);
  }

  const chunkSize = 10_000;

  let last: DocumentSnapshot<T> | undefined;
  for (;;) {
    const q = query(db, collection, converter, {
      ...options,
      limit: chunkSize,
      startAfter: last,
    });

    const snapshot = await getDocs(q);
    if (snapshot.empty) break;

    for (const doc of snapshot.docs) {
      await writableStream.write(`${formatter(doc.data())}\n`);
    }

    last = snapshot.docs.at(-1);
  }

  await writableStream.close();
}
