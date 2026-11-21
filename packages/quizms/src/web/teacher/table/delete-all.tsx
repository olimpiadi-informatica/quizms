import type { RefObject } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import { Form, FormButton, Modal, SubmitButton } from "@olinfo/react-components";

import { useTeacher, useTeacherStudents } from "~/web/teacher/context";

export function DeleteAllModal({ ref }: { ref: RefObject<HTMLDialogElement | null> }) {
  const { t } = useLingui();
  const [students] = useTeacherStudents();
  const { setStudentsDisabled } = useTeacher();

  const close = () => {
    ref.current?.close();
  };

  const confirm = async () => {
    await setStudentsDisabled(
      students.map((student) => student.id),
      true,
    );
    close();
  };

  return (
    <Modal ref={ref} title={t`Delete all students`}>
      <div className="prose break-words">
        <p>
          <Trans>
            You are about to delete <b>all</b> the students entered. You can see the deleted
            students and undo the deletions by clicking on the header of the “<i>Delete</i>” column
            and choosing “<i>Select all</i>” as the filter.
          </Trans>
        </p>
        <Form onSubmit={confirm} className="!max-w-full">
          <div className="flex flex-wrap justify-center gap-2">
            <FormButton onClick={() => close()}>
              <Trans>Cancel</Trans>
            </FormButton>
            <SubmitButton className="btn-warning">
              <Trans>Continue</Trans>
            </SubmitButton>
          </div>
        </Form>
      </div>
    </Modal>
  );
}
