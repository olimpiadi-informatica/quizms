import { forwardRef, type Ref } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import { Form, FormButton, Modal, SubmitButton } from "@olinfo/react-components";

import { useTeacherStudents } from "~/web/teacher/context";

export const DeleteAllModal = forwardRef(function DeleteModal(
  _,
  ref: Ref<HTMLDialogElement> | null,
) {
  const [students, setStudent] = useTeacherStudents();
  const { t } = useLingui();

  const close = () => {
    if (ref && "current" in ref && ref.current) {
      ref.current.close();
    }
  };

  const confirm = async () => {
    await Promise.all(students.map((student) => setStudent({ ...student, disabled: true })));
    close();
  };

  return (
    <Modal ref={ref} title={t`Delete student`}>
      <div className="prose break-words">
        <p>
          <Trans>
            You are about to delete <b>all</b> entered students. You can view deleted students and
            cancel their deletion by clicking on the header of the column &ldquo;<i>Delete</i>
            &rdquo; and choosing &ldquo;<i>Select all</i>&rdquo; as a filter.
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
});
