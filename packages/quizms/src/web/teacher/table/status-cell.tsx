import { useRef } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import { Form, FormButton, Modal, SubmitButton } from "@olinfo/react-components";
import type { ICellRendererParams } from "ag-grid-community";
import { format } from "date-fns";
import { RotateCcw } from "lucide-react";

import type { Student, StudentPhase } from "~/models";
import { useStudentPhase } from "~/web/student/phase";
import { useTeacher } from "~/web/teacher/context";
import { SubmissionRequestActions } from "~/web/teacher/dashboard-submission-requests";

export function StudentStatusCell({ data }: ICellRendererParams<Student>) {
  if (!data?.participationWindow) return null;
  return <StudentStatus student={data} />;
}

function StudentStatus({ student }: { student: Student }) {
  const { t } = useLingui();
  const { venue, reopenStudent } = useTeacher();
  const phase = useStudentPhase(student);

  const labels: Record<StudentPhase, string> = {
    not_started: t`Not started`,
    ongoing: t`In progress`,
    pending_approval: t`Submission requested`,
    submitted: t`Submitted`,
    expired: t`Time expired`,
  };
  const badges: Record<StudentPhase, string> = {
    not_started: "badge-ghost",
    ongoing: "badge-success",
    pending_approval: "badge-warning",
    submitted: "badge-neutral",
    expired: "badge-neutral",
  };

  // Same conditions as `teacherReopenStudent`. `useStudentPhase` re-renders the cell when the
  // window ends, so the button disappears then.
  const canReopen =
    !!reopenStudent &&
    phase === "submitted" &&
    !venue.finalized &&
    !!venue.token &&
    student.token === venue.token &&
    !!student.participationWindow &&
    student.participationWindow.end > new Date();

  const submittedAt = student.submittedAt && format(student.submittedAt, "HH:mm");
  const tooltip =
    phase === "submitted" && submittedAt
      ? student.submittedBy === "teacher"
        ? t`Submitted by the teacher at ${submittedAt}`
        : t`Submitted by the student at ${submittedAt}`
      : undefined;

  return (
    <div className="flex h-full items-center gap-1" title={tooltip}>
      <span className={`badge badge-sm ${badges[phase]}`}>
        {labels[phase]}
        {phase === "submitted" && submittedAt && ` ${submittedAt}`}
      </span>
      {canReopen && <ReopenButton student={student} reopen={reopenStudent} />}
      {phase === "pending_approval" && !venue.finalized && (
        <SubmissionRequestActions student={student} />
      )}
    </div>
  );
}

function ReopenButton({
  student,
  reopen,
}: {
  student: Student;
  reopen: (studentId: string) => Promise<void>;
}) {
  const { t } = useLingui();
  const ref = useRef<HTMLDialogElement>(null);
  const name = [student.userData?.name, student.userData?.surname].filter(Boolean).join(" ");

  const confirm = async () => {
    await reopen(student.id);
    ref.current?.close();
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost btn-xs"
        title={t`Reopen contest`}
        onClick={() => ref.current?.showModal()}>
        <RotateCcw size={14} />
        <span className="sr-only">
          <Trans>Reopen contest</Trans>
        </span>
      </button>
      <Modal ref={ref} title={t`Reopen contest`}>
        <div className="prose">
          <p>
            <Trans>
              The student <b>{name}</b> will be able to keep answering until the end of their time.
              The answers already given are kept.
            </Trans>
          </p>
          <Form onSubmit={confirm} className="!max-w-full">
            <div className="flex flex-wrap justify-center gap-2">
              <FormButton onClick={() => ref.current?.close()}>
                <Trans>Cancel</Trans>
              </FormButton>
              <SubmitButton className="btn-warning">
                <Trans>Reopen</Trans>
              </SubmitButton>
            </div>
          </Form>
        </div>
      </Modal>
    </>
  );
}
