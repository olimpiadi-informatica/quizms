import { forwardRef, type Ref } from "react";

import { Form, FormButton, Modal, SubmitButton } from "@olinfo/react-components";

import { useTeacherStudents } from "~/web/teacher/provider";

export const DeleteAllModal = forwardRef(function DeleteModal(
  _,
  ref: Ref<HTMLDialogElement> | null,
) {
  const [students, setStudent] = useTeacherStudents();

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
    <Modal ref={ref} title="Cancella studente">
      <div className="prose break-words">
        <p>
          Stai per cancellare <b>tutti</b> gli studenti inseriti. Puoi vedere gli studenti
          cancellati e annullarne le cancellazioni cliccando sulla testata della colonna &ldquo;
          <i>Cancella</i>&rdquo; e scegliendo &ldquo;<i>Seleziona tutti</i>&rdquo; come filtro.
        </p>
        <Form onSubmit={confirm} className="!max-w-full">
          <div className="flex flex-wrap justify-center gap-2">
            <FormButton onClick={() => close()}>Annulla</FormButton>
            <SubmitButton className="btn-warning">Continua</SubmitButton>
          </div>
        </Form>
      </div>
    </Modal>
  );
});
