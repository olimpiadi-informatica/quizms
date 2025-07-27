import { forwardRef, type Ref, useMemo } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
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
  const { contest, participation, variants, setParticipation } = useTeacher();
  const [students] = useTeacherStudents();
  const { t } = useLingui();

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

      const reason = isStudentIncomplete(student, contest, variants, t);
      if (reason) {
        if (!name || !surname) return t`At least one student doesn't have a name or surname`;
        return t`The student ${name} ${surname} cannot be finalized: ${lowerFirst(reason)}.`;
      }

      for (const normalized of normalize(student)) {
        if (prevStudents.has(normalized)) {
          return t`The student ${name} ${surname} has been entered multiple times`;
        }
        prevStudents.add(normalized);
      }
    }
  }, [students, contest, variants, t]);

  const correctConfirm = t`all students have been correctly entered`;

  const close = () => {
    if (ref && "current" in ref) {
      ref.current?.close();
    }
  };

  const finalize = async () => {
    try {
      await setParticipation({ ...participation, finalized: true });
    } finally {
      close();
    }
  };

  return (
    <Modal ref={ref} title={t`Finalize School`}>
      {error ? (
        <div className="prose">
          <p>
            <Trans>It is not possible to finalize the school due to the following error:</Trans>
          </p>
          <p className="flex justify-center rounded-box bg-base-200 px-3 py-2">{error}</p>
          {contest.allowStudentDelete && (
            <p>
              <Trans>
                If this student was added by mistake and you want to remove them, you can use the
                <i> Delete</i> button in the last column.
              </Trans>
            </p>
          )}
        </div>
      ) : (
        <Form onSubmit={finalize} className="!max-w-full">
          <div className="prose">
            <p>
              <Trans>
                <strong className="text-error">Warning:</strong> this operation is irreversible.
              </Trans>
            </p>
            <p>
              {contest.allowStudentImport ? (
                <Trans>
                  After finalizing, it will <b>no longer</b> be possible to <b>add</b> new students
                  or <b>modify</b> student data in this school for the competition{" "}
                  <i>{contest?.name}</i>.
                </Trans>
              ) : (
                <Trans>
                  After finalizing, it will <b>no longer</b> be possible to <b>modify</b> student
                  data in this school for the competition <i>{contest?.name}</i>.
                </Trans>
              )}
            </p>
            <p>
              <Trans>
                If you understand and agree, write &ldquo;<i>{correctConfirm}</i>&rdquo;.
              </Trans>
            </p>
          </div>
          <TextField
            field="confirm"
            label={t`Confirm`}
            placeholder={correctConfirm.replace(/(?<=\S+\s\S+)\s.*$/, "...")}
          />
          {({ confirm }) => (
            <div className="flex flex-wrap justify-center gap-2">
              <FormButton onClick={close}>
                <Trans>Cancel</Trans>
              </FormButton>
              <SubmitButton
                className="btn-error"
                icon={TriangleAlert}
                disabled={confirm !== correctConfirm}>
                <Trans>Confirm</Trans>
              </SubmitButton>
            </div>
          )}
        </Form>
      )}
    </Modal>
  );
});
