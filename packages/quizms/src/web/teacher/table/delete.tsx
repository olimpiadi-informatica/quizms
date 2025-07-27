import { forwardRef, type Ref } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import { CheckboxField, Form, FormButton, Modal, SubmitButton } from "@olinfo/react-components";

import { deleteConfirmStorageKey } from "./utils";

export const DeleteModal = forwardRef(function DeleteModal(
  { studentName }: { studentName: string },
  ref: Ref<HTMLDialogElement> | null,
) {
  const { t } = useLingui();

  const close = (value: string) => {
    if (ref && "current" in ref && ref.current) {
      ref.current.returnValue = value;
      ref.current.close();
    }
  };

  const confirm = ({ notAgain }: { notAgain: boolean }) => {
    sessionStorage.setItem(deleteConfirmStorageKey, notAgain ? "1" : "0");
    close("1");
  };

  return (
    <Modal ref={ref} title={t`Delete student`}>
      <div className="prose break-words">
        <p>
          {studentName ? (
            <Trans>
              You are about to delete <b>{studentName}</b>.
            </Trans>
          ) : (
            <Trans>You are about to delete a student.</Trans>
          )}{" "}
          <Trans>
            You can view deleted students and cancel the deletion by clicking on the header of the
            column &ldquo;<i>Delete</i>&rdquo; and choosing &ldquo;<i>Select all</i>&rdquo; as a
            filter.
          </Trans>
        </p>
        <Form onSubmit={confirm} className="!max-w-full">
          <CheckboxField field="notAgain" label={t`Don't show this pop-up again`} optional />
          <div className="flex flex-wrap justify-center gap-2">
            <FormButton onClick={() => close("0")}>
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
