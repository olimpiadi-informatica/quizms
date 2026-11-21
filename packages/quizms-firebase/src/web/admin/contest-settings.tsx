import type { Contest } from "@olinfo/quizms/models";
import { Form, SelectField, SubmitButton, TextAreaField } from "@olinfo/react-components";

import { adminUpdateContestSettings } from "~/web/common/api";

import { useAdmin } from "./context";

export default function ContestSettings() {
  const { contest, user } = useAdmin();

  const save = async (newContest: Pick<Contest, "instructions" | "scoreVisibility">) => {
    // The form state is the whole contest: send only the editable fields. An empty text area
    // removes the instructions.
    await adminUpdateContestSettings(user, {
      contestId: contest.id,
      settings: {
        scoreVisibility: newContest.scoreVisibility,
        instructions: newContest.instructions?.trim() || null,
      },
    });
  };

  return (
    <Form key={contest.id} defaultValue={contest} onSubmit={save} className="!max-w-full">
      <SelectField
        field="scoreVisibility"
        label="Mostra punteggi"
        options={{ never: "Mai", always: "Sempre", finalized: "Solo alle scuole finalizzate" }}
      />
      <TextAreaField field="instructions" label="Istruzioni gara" rows={8} optional={true} />
      <SubmitButton>Salva</SubmitButton>
    </Form>
  );
}
