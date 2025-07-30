import { Suspense, useMemo, useRef } from "react";

import { Form, Modal, NumberField, SubmitButton } from "@olinfo/react-components";
import { groupBy, sortBy } from "lodash-es";
import { Check, X } from "lucide-react";

import type { StudentRestore } from "~/models";
import { hash } from "~/utils/hash";

import { useTeacherStudentRestores } from "./context";

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

  const targetCodes = useMemo(
    () => new Set(studentRestore.map((request) => hash(request.id) % 1000)),
    [studentRestore],
  );

  const approveRequest = async ({ restoreCode }: { restoreCode: number }) => {
    const request = studentRestore.find((request) => hash(request.id) % 1000 === restoreCode);
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
        <button type="button" className="btn btn-square btn-error btn-sm" onClick={rejectRequest}>
          <X />
        </button>
      </td>
      <td>
        <button
          type="button"
          className="btn btn-square btn-success btn-sm"
          onClick={() => modalRef.current?.showModal()}>
          <Check />
        </button>
        <Modal ref={modalRef} title="Conferma">
          <p>
            {studentRestore[0].name} {studentRestore[0].surname} sta cercando di accedere alla gara.
            Per approvarlo, inserisci il codice di conferma che gli è stato mostrato.
          </p>
          <Form onSubmit={approveRequest} className="!max-w-full">
            <NumberField
              field="restoreCode"
              label="Codice di conferma"
              placeholder="Inserisci codice"
            />
            {({ restoreCode }) => (
              <SubmitButton disabled={!targetCodes.has(restoreCode ?? -1)}>Approva</SubmitButton>
            )}
          </Form>
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
    <div className="h-full overflow-auto rounded-lg border border-base-content/15">
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
