import { forwardRef, type Ref } from "react";

import { CheckboxField, Form, FormButton, Modal, SubmitButton } from "@olinfo/react-components";

import { deleteConfirmStorageKey } from "./utils";

export const DeleteModal = forwardRef(function DeleteModal(
  { studentName }: { studentName: string },
  ref: Ref<HTMLDialogElement> | null,
) {
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
    <Modal ref={ref} title="Cancella studente">
      <div className="prose break-words">
        <p>
          Stai per cancellare{" "}
          {studentName ? (
            <>
              lo studente <b>{studentName}</b>
            </>
          ) : (
            "uno studente"
          )}
          . Puoi vedere gli studenti cancellati e annullarne la cancellazione cliccando sulla
          testata della colonna &ldquo;<i>Cancella</i>&rdquo; e scegliendo &ldquo;
          <i>Seleziona tutti</i>&rdquo; come filtro.
        </p>
        <Form onSubmit={confirm} className="!max-w-full">
          <CheckboxField field="notAgain" label="Non mostrare più questo pop-up" optional />
          <div className="flex flex-wrap justify-center gap-2">
            <FormButton onClick={() => close("0")}>Annulla</FormButton>
            <SubmitButton className="btn-warning">Continua</SubmitButton>
          </div>
        </Form>
      </div>
    </Modal>
  );
});
