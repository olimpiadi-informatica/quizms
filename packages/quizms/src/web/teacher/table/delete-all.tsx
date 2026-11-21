import type { RefObject } from "react";

import { Form, FormButton, Modal, SubmitButton } from "@olinfo/react-components";

import { useTeacher, useTeacherStudents } from "~/web/teacher/context";

export function DeleteAllModal({ ref }: { ref: RefObject<HTMLDialogElement | null> }) {
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
}
