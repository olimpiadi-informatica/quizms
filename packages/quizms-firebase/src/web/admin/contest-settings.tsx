import type { Contest } from "@olinfo/quizms/models";
import { Form, SelectField, SubmitButton, TextAreaField } from "@olinfo/react-components";

import { useAdmin } from "./context";

export default function ContestSettings() {
  const { contest, setContest } = useAdmin();

  const save = async (newContest: Pick<Contest, "instructions" | "scoreVisibility">) => {
    await setContest({ ...contest, ...newContest });
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
