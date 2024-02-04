import React, { Ref, forwardRef, useRef } from "react";

import { DocumentSnapshot, Firestore, FirestoreDataConverter, getDocs } from "firebase/firestore";
import { AlertTriangle } from "lucide-react";

import { Button, Modal } from "~/components";
import { useDb } from "~/web/firebase/base-login";
import query, { QueryOption } from "~/web/firebase/query";

import { useAdmin } from "./provider";

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
      <button className="btn btn-error" onClick={() => ref.current?.showModal()}>
        Esporta {props.label}
      </button>
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
      <div className="flex flex-col gap-3">
        <div>
          Stai per esportare i dati di {description} della gara <b>{contest.name}</b>. Questa
          operazione esegue un grande numero di query al database che richiederà del tempo e potrà
          incidere sulla fatturazione del progetto.
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-warning" />
          <span>Per esportare i dati devi usare un browser Chrome o Edge.</span>
        </div>
        <div className="flex justify-center">
          <Button className="btn btn-error" onClick={onExport}>
            Esporta
          </Button>
        </div>
      </div>
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
      await writableStream.write(JSON.stringify(doc.data()) + "\n");
    }

    last = snapshot.docs.at(-1);
  }

  await writableStream.close();
}
