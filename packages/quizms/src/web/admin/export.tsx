import { forwardRef, type Ref, useRef } from "react";

import { Button, Modal } from "@olinfo/react-components";
import {
  type DocumentSnapshot,
  type Firestore,
  type FirestoreDataConverter,
  getDocs,
} from "firebase/firestore";
import { TriangleAlert } from "lucide-react";

import { useDb } from "~/web/firebase/common/base-login";
import query, { type QueryOption } from "~/web/firebase/common/query";

import { useAdmin } from "./context";

type Props<T> = {
  label: string;
  description: string;
  collection: string;
  converter: FirestoreDataConverter<T>;
  options: QueryOption<T>;
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
  { label, description, collection, converter, options }: Props<any>,
  ref: Ref<HTMLDialogElement>,
) {
  const { contest } = useAdmin();
  const db = useDb();

  const onExport = async () => {
    await saveExport(db, collection, converter, options);
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
            Stai per esportare i dati di {description} della gara <b>{contest.name}</b>. Questa
            operazione esegue un grande numero di query al database che richiederà del tempo e potrà
            incidere sulla fatturazione del progetto.
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

async function saveExport<T>(
  db: Firestore,
  collection: string,
  converter: FirestoreDataConverter<T>,
  options: QueryOption<T>,
) {
  const handle = await window.showSaveFilePicker({
    suggestedName: `${collection}.jsonl`,
  });

  const writableStream = await handle.createWritable();

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
      await writableStream.write(`${JSON.stringify(doc.data())}\n`);
    }

    last = snapshot.docs.at(-1);
  }

  await writableStream.close();
}
