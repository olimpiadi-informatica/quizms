import type { RefObject } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import { CheckboxField, Form, FormButton, Modal, SubmitButton } from "@olinfo/react-components";

import { deleteConfirmStorageKey } from "./utils";

export function DeleteModal({
  studentName,
  ref,
}: {
  studentName: string;
  ref: RefObject<HTMLDialogElement | null>;
}) {
  const { t } = useLingui();

  const close = (value: string) => {
    if (ref.current) {
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
              You are about to delete the student <b>{studentName}</b>. You can see the deleted
              students and undo the deletion by clicking on the header of the “<i>Delete</i>” column
              and choosing “<i>Select all</i>” as the filter.
            </Trans>
          ) : (
            <Trans>
              You are about to delete a student. You can see the deleted students and undo the
              deletion by clicking on the header of the “<i>Delete</i>” column and choosing “
              <i>Select all</i>” as the filter.
            </Trans>
          )}
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
}
