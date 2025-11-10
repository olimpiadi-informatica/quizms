import { forwardRef, type Ref, useMemo } from "react";

import { Form, FormButton, Modal, SubmitButton, TextField } from "@olinfo/react-components";
import { deburr, lowerFirst } from "lodash-es";
import { TriangleAlert } from "lucide-react";

import type { Student } from "~/models";
import { useTeacher, useTeacherStudents } from "~/web/teacher/context";

import { isStudentIncomplete } from "./utils";

export const FinalizeModal = forwardRef(function FinalizeModal(
  _props,
  ref: Ref<HTMLDialogElement> | null,
) {
  const { contest, variants, finalizeParticipation } = useTeacher();
  const [students] = useTeacherStudents();

  const error = useMemo(() => {
    const prevStudents = new Set<string>();

    // Generate a list of string that can uniquely identify a student. Multiple
    // strings are generated to prevent possible errors during data entry.
    function normalize(student: Student) {
      const info = student.userData;
      const orderings = [
        ["name", "surname", "classYear", "classSection"],
        ["surname", "name", "classYear", "classSection"],
      ];
      return orderings.map((fields) => {
        return deburr(fields.map((field) => info?.[field] ?? "").join("\n"))
          .toLowerCase()
          .replaceAll(/[^\w\n]/g, "");
      });
    }

    for (const student of students) {
      if (student.disabled) continue;

      const { name, surname } = student.userData ?? {};

      const reason = isStudentIncomplete(student, contest, variants);
      if (reason) {
        if (!name || !surname) return "Almeno uno studente non ha nome o cognome";
        return `Lo studente ${name} ${surname} non può essere finalizzato: ${lowerFirst(reason)}.`;
      }

      for (const normalized of normalize(student)) {
        if (prevStudents.has(normalized)) {
          return `Lo studente ${name} ${surname} è stato inserito più volte`;
        }
        prevStudents.add(normalized);
      }
    }
  }, [students, contest, variants]);

  const correctConfirm = "tutti gli studenti sono stati correttamente inseriti";

  const close = () => {
    if (ref && "current" in ref) {
      ref.current?.close();
    }
  };

  const finalize = async () => {
    try {
      await finalizeParticipation();
    } finally {
      close();
    }
  };

  return (
    <Modal ref={ref} title="Finalizza scuola">
      {error ? (
        <div className="prose">
          <p>Non è possibile finalizzare la scuola a causa del seguente errore:</p>
          <p className="flex justify-center rounded-box bg-base-200 px-3 py-2">{error}</p>
          {contest.allowStudentDelete && (
            <p>
              Se questo studente è stato aggiunto per errore e vuoi rimuoverlo, puoi usare il
              pulsante <i>Cancella</i> nell&apos;ultima colonna.
            </p>
          )}
        </div>
      ) : (
        <Form onSubmit={finalize} className="!max-w-full">
          <div className="prose">
            <p>
              <strong className="text-error">Attenzione:</strong> questa operazione è irreversibile.
            </p>
            <p>
              Finalizzando <b>non</b> sarà più possibile{" "}
              {contest.allowStudentImport && (
                <>
                  <b>aggiungere</b> nuovi studenti o{" "}
                </>
              )}
              <b>modificare</b> i dati degli studenti in questa scuola per la gara{" "}
              <i>{contest?.name}</i>.
            </p>
            <p>
              Se hai capito e sei d&apos;accordo, scrivi &ldquo;<i>{correctConfirm}</i>&rdquo;.
            </p>
          </div>
          <TextField field="confirm" label="Conferma" placeholder="tutti gli studenti..." />
          {({ confirm }) => (
            <div className="flex flex-wrap justify-center gap-2">
              <FormButton onClick={close}>Annulla</FormButton>
              <SubmitButton
                className="btn-error"
                icon={TriangleAlert}
                disabled={confirm !== correctConfirm}>
                Conferma
              </SubmitButton>
            </div>
          )}
        </Form>
      )}
    </Modal>
  );
});
