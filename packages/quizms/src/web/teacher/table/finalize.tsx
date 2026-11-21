import { type RefObject, useMemo } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import { Form, FormButton, Modal, SubmitButton, TextField } from "@olinfo/react-components";
import { lowerFirst } from "lodash-es";
import { TriangleAlert } from "lucide-react";

import { userDataMatch } from "~/models";
import { useContentLanguage, useLocalize } from "~/web/components";
import { useTeacher, useTeacherStudents } from "~/web/teacher/context";

import { isStudentIncomplete } from "./utils";

export function FinalizeModal({ ref }: { ref: RefObject<HTMLDialogElement | null> }) {
  const { contest, variants, finalizeVenue } = useTeacher();
  const [students] = useTeacherStudents();
  const { t, i18n } = useLingui();
  const localize = useLocalize();
  const language = useContentLanguage();

  const error = useMemo(() => {
    const prevStudents = [];

    for (const student of students) {
      if (student.disabled) continue;

      const { name, surname } = student.userData ?? {};

      const incomplete = isStudentIncomplete(student, contest, variants, i18n, language);
      if (incomplete) {
        if (!name || !surname) return t`At least one student has no name or surname`;
        const reason = lowerFirst(incomplete);
        return t`The student ${name} ${surname} cannot be finalized: ${reason}.`;
      }

      for (const prevStudent of prevStudents) {
        if (userDataMatch(contest, student, prevStudent)) {
          return t`The student ${name} ${surname} has been entered more than once`;
        }
      }
      prevStudents.push(student);
    }
  }, [students, contest, variants, t, i18n, language]);

  const correctConfirm = t`all the students have been entered correctly`;
  const contestName = localize(contest?.name);

  const close = () => {
    ref.current?.close();
  };

  const finalize = async () => {
    try {
      await finalizeVenue();
    } finally {
      close();
    }
  };

  return (
    <Modal ref={ref} title={t`Finalize school`}>
      {error ? (
        <div className="prose">
          <p>
            <Trans>The school cannot be finalized because of the following error:</Trans>
          </p>
          <p className="flex justify-center rounded-box bg-base-200 px-3 py-2">{error}</p>
          {contest.allowStudentDelete && (
            <p>
              <Trans>
                If this student was added by mistake and you want to remove them, you can use the{" "}
                <i>Delete</i> button in the last column.
              </Trans>
            </p>
          )}
        </div>
      ) : (
        <Form onSubmit={finalize} className="!max-w-full">
          <div className="prose">
            <p>
              {contest.onlineSettings?.allowRestart ? (
                <Trans>
                  <strong className="text-error">Warning:</strong> this operation cannot be undone
                  and must be done only once <b>after all the contest rounds</b>.
                </Trans>
              ) : (
                <Trans>
                  <strong className="text-error">Warning:</strong> this operation cannot be undone.
                </Trans>
              )}
            </p>
            <p>
              {contest.allowStudentImport ? (
                <Trans>
                  Once finalized, you will <b>no longer</b> be able to <b>add</b> new students or{" "}
                  <b>edit</b> the data of the students in this school for the contest{" "}
                  <i>{contestName}</i>.
                </Trans>
              ) : (
                <Trans>
                  Once finalized, you will <b>no longer</b> be able to <b>edit</b> the data of the
                  students in this school for the contest <i>{contestName}</i>.
                </Trans>
              )}
            </p>
            <p>
              <Trans>
                If you understand and agree, type “<i>{correctConfirm}</i>”.
              </Trans>
            </p>
          </div>
          <TextField field="confirm" label={t`Confirm`} placeholder={t`all the students...`} />
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
}
