import { forwardRef, type Ref } from "react";

import { Form, FormButton, Modal, SubmitButton } from "@olinfo/react-components";
import { sumBy } from "lodash-es";

import { calcProblemPoints, type Schema } from "~/models";

import { useStudent } from "./context";

export const CompletedModal = forwardRef(function CompletedModal(
  _props,
  ref: Ref<HTMLDialogElement>,
) {
  const { schema } = useStudent();

  return (
    <Modal ref={ref} title="Prova terminata">
      <p>La prova è terminata.</p>
      {schema && <PointsTable schema={schema} />}
    </Modal>
  );
});
CompletedModal.displayName = "CompletedModal";

export function PointsTable({ schema }: { schema: Schema }) {
  const { student } = useStudent();

  const problems = Object.keys(schema);
  problems.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const maxPoints = sumBy(Object.values(schema), "maxPoints");

  return (
    <>
      <p>
        Hai ottenuto un punteggio di <b>{student.score}</b> su <b>{maxPoints}</b>.
      </p>
      <table className="table table-sm text-center mt-4">
        <thead>
          <tr>
            <th scope="col">Domanda</th>
            <th scope="col">Risposta</th>
            <th scope="col">Soluzione</th>
            <th scope="col">Punteggio</th>
          </tr>
        </thead>
        <tbody>
          {problems.map((problem) => {
            const answer = student.answers?.[problem];
            const problemSchema = schema[problem];
            const correctOptions = problemSchema.options
              ?.filter((o) => o.points === problemSchema.maxPoints)
              .map((o) => o.value);
            return (
              <tr key={problem}>
                <td>{problem}</td>
                <td>{answer ?? "-"}</td>
                <td>{correctOptions?.join(", ")}</td>
                <td>{calcProblemPoints(problemSchema, answer)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

export const SubmitModal = forwardRef(function SubmitModal(_, ref: Ref<HTMLDialogElement>) {
  const { student, setStudent, onSubmit } = useStudent();

  const close = () => {
    if (ref && "current" in ref) {
      ref.current?.close();
    }
  };

  const confirm = async () => {
    try {
      await setStudent({
        ...student,
        finishedAt: new Date(),
      });
      await onSubmit?.();
      if (ref && "current" in ref && ref.current) {
        ref.current.returnValue = "1";
      }
    } finally {
      close();
    }
  };

  return (
    <Modal ref={ref} title="Confermi di voler terminare?">
      <p>Confermando non potrai più modificare le tue risposte.</p>
      <Form onSubmit={confirm} className="!max-w-full">
        <div className="flex flex-wrap justify-center gap-2">
          <FormButton onClick={close}>Annulla</FormButton>
          <SubmitButton className="btn-error">Conferma</SubmitButton>
        </div>
      </Form>
    </Modal>
  );
});
SubmitModal.displayName = "SubmitModal";
