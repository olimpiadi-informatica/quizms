import { Suspense, useState } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import { format } from "date-fns";
import { sortBy } from "lodash-es";
import { Check, X } from "lucide-react";

import { getStudentPhase, type Student } from "~/models";
import { useStudentPhase } from "~/web/student/phase";

import { useTeacher, useTeacherStudents } from "./context";

/** Approve and reject buttons for a pending submission request. */
export function SubmissionRequestActions({ student }: { student: Student }) {
  const { t } = useLingui();
  const { approveSubmission, rejectSubmission } = useTeacher();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const run = async (action?: (studentId: string) => Promise<void>) => {
    if (!action) return;
    setBusy(true);
    setError(undefined);
    try {
      await action(student.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-1" title={error}>
      {rejectSubmission && (
        <button
          type="button"
          className="btn btn-square btn-error btn-xs"
          disabled={busy}
          title={t`Send back`}
          onClick={() => run(rejectSubmission)}>
          <X size={14} />
          <span className="sr-only">
            <Trans>Send back</Trans>
          </span>
        </button>
      )}
      {approveSubmission && (
        <button
          type="button"
          className="btn btn-square btn-success btn-xs"
          disabled={busy}
          title={t`Approve submission`}
          onClick={() => run(approveSubmission)}>
          <Check size={14} />
          <span className="sr-only">
            <Trans>Approve submission</Trans>
          </span>
        </button>
      )}
      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  );
}

function SubmissionRequestRow({ student }: { student: Student }) {
  // A request still pending when the window ends is no longer actionable.
  const phase = useStudentPhase(student);
  if (phase !== "pending_approval") return null;

  return (
    <tr>
      <td>{student.userData?.surname}</td>
      <td>{student.userData?.name}</td>
      <td>{student.terminationRequestedAt && format(student.terminationRequestedAt, "HH:mm")}</td>
      <td>
        <SubmissionRequestActions student={student} />
      </td>
    </tr>
  );
}

function SubmissionRequestListInner() {
  const { venue } = useTeacher();
  const [students] = useTeacherStudents();

  const pending = sortBy(
    students.filter(
      (s) => !s.disabled && s.token === venue.token && getStudentPhase(s) === "pending_approval",
    ),
    ["terminationRequestedAt"],
  );

  if (!pending.length) return <EmptyRow />;

  return pending.map((student) => <SubmissionRequestRow key={student.id} student={student} />);
}

function EmptyRow() {
  return (
    <tr>
      <td colSpan={4}>
        <Trans>No requests.</Trans>
      </td>
    </tr>
  );
}

export function SubmissionRequestList({ isStarted }: { isStarted: boolean }) {
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
            <th>
              <Trans>Requested at</Trans>
            </th>
            <th className="w-24" />
          </tr>
        </thead>
        <tbody>
          {isStarted ? (
            <Suspense fallback={<EmptyRow />}>
              <SubmissionRequestListInner />
            </Suspense>
          ) : (
            <EmptyRow />
          )}
        </tbody>
      </table>
    </div>
  );
}
