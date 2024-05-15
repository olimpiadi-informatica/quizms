import { Suspense, useRef, useState } from "react";

import { groupBy, sortBy } from "lodash-es";
import { Check, X } from "lucide-react";

import { Button, Buttons, Modal } from "~/components";
import { StudentRestore } from "~/models";
import { hash } from "~/utils/random";

import { useTeacherStudentRestores } from "./provider";

function StudentRestoreEntry({
  studentRestore,
  approve,
  reject,
}: {
  studentRestore: StudentRestore[];
  approve: (studentRestore: StudentRestore) => Promise<void>;
  reject: (studentId: string) => Promise<void>;
}) {
  const modalRef = useRef<HTMLDialogElement>(null);
  const [code, setCode] = useState("");

  const targetCodes = studentRestore.map((request) =>
    `${hash(request.id) % 1000}`.padStart(3, "0"),
  );

  const approveRequest = async () => {
    const request = studentRestore.find(
      (request) => String(hash(request.id) % 1000).padStart(3, "0") === code,
    );
    if (request) {
      await approve(request);
    }
  };

  const rejectRequest = async () => {
    await reject(studentRestore[0].studentId);
  };

  return (
    <tr>
      <td>{studentRestore[0].surname}</td>
      <td>{studentRestore[0].name}</td>
      <td>
        <button className="btn btn-square btn-error btn-sm" onClick={rejectRequest}>
          <X />
        </button>
      </td>
      <td>
        <button
          className="btn btn-square btn-success btn-sm"
          onClick={() => modalRef.current?.showModal()}>
          <Check />
        </button>
        <Modal ref={modalRef} title="Conferma">
          <p>
            {studentRestore[0].name} {studentRestore[0].surname} sta cercando di accedere alla gara.
            Per approvarlo, inserisci il codice di conferma che gli è stato mostrato.
          </p>
          <label className="form-control mt-3 w-full">
            <div className="label">
              <span className="label-text">Codice di conferma</span>
            </div>
            <input
              id={`restore-${studentRestore[0].studentId}`}
              type="number"
              placeholder="Inserisci codice"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="input input-bordered w-full"
            />
          </label>
          <Buttons className="mt-3">
            <Button
              className="btn-error"
              onClick={approveRequest}
              disabled={!targetCodes.includes(code)}>
              Approva
            </Button>
          </Buttons>
        </Modal>
      </td>
    </tr>
  );
}

function StudentRestoreListInner() {
  const [studentRestores, approve, reject] = useTeacherStudentRestores();

  if (!studentRestores?.length) {
    return (
      <tr>
        <td>Nessuna richiesta.</td>
      </tr>
    );
  }

  const entries = sortBy(groupBy(studentRestores, "studentId"), ["0.surname", "0.name"]);
  return entries.map((entry) => (
    <StudentRestoreEntry
      studentRestore={entry}
      key={entry[0].studentId}
      approve={approve}
      reject={reject}
    />
  ));
}

export function StudentRestoreList() {
  return (
    <div className="flex h-full flex-col items-start gap-3 overflow-auto rounded-lg border border-base-content/15">
      <table className="table table-pin-rows">
        <thead>
          <tr>
            <th>Cognome</th>
            <th>Nome</th>
            <th className="w-12">Rifiuta</th>
            <th className="w-12">Approva</th>
          </tr>
        </thead>
        <tbody>
          <Suspense
            fallback={
              <tr>
                <td>Nessuna richiesta.</td>
              </tr>
            }>
            <StudentRestoreListInner />
          </Suspense>
        </tbody>
      </table>
    </div>
  );
}
