import { Suspense, useMemo, useRef } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import { Form, Modal, NumberField, SubmitButton } from "@olinfo/react-components";
import { groupBy, sortBy } from "lodash-es";
import { Check, X } from "lucide-react";

import type { StudentRestore } from "~/models";

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
  const { t } = useLingui();
  const modalRef = useRef<HTMLDialogElement>(null);
  const name = studentRestore[0].name;
  const surname = studentRestore[0].surname;

  const targetCodes = useMemo(
    () => new Set(studentRestore.map((request) => request.approvalCode)),
    [studentRestore],
  );

  const approveRequest = async ({ approvalCode }: { approvalCode: number }) => {
    const request = studentRestore.find((request) => request.approvalCode === approvalCode);
    if (request) {
      await approve(request);
    }
  };

  const rejectRequest = async () => {
    await reject(studentRestore[0].studentId);
  };

  return (
    <tr>
      <td>{surname}</td>
      <td>{name}</td>
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
        <Modal ref={modalRef} title={t`Confirm`}>
          <p>
            <Trans>
              {name} {surname} is trying to access the contest. To approve the request, enter the
              confirmation code they were shown.
            </Trans>
          </p>
          <Form onSubmit={approveRequest} className="!max-w-full">
            <NumberField
              field="approvalCode"
              label={t`Confirmation code`}
              placeholder={t`Enter code`}
            />
            {({ approvalCode }) => (
              <SubmitButton disabled={!targetCodes.has(approvalCode ?? -1)}>
                <Trans>Approve</Trans>
              </SubmitButton>
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
        <td>
          <Trans>No requests.</Trans>
        </td>
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

export function StudentRestoreList({ isStarted }: { isStarted: boolean }) {
  return (
    <div className="h-full overflow-auto rounded-lg border border-base-content/15">
      <table className="table table-pin-rows">
        <thead>
          <tr>
            <th>
              <Trans>Surname</Trans>
            </th>
            <th>
              <Trans>Name</Trans>
            </th>
            <th className="w-12">
              <Trans>Reject</Trans>
            </th>
            <th className="w-12">
              <Trans>Approve</Trans>
            </th>
          </tr>
        </thead>
        <tbody>
          <Suspense
            fallback={
              <tr>
                <td>
                  <Trans>No requests.</Trans>
                </td>
              </tr>
            }>
            {isStarted ? (
              <StudentRestoreListInner />
            ) : (
              <tr>
                <td>
                  <Trans>No requests.</Trans>
                </td>
              </tr>
            )}
          </Suspense>
        </tbody>
      </table>
    </div>
  );
}
