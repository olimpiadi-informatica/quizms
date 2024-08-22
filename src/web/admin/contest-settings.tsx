import { Form, SubmitButton, TextAreaField } from "@olinfo/react-components";

import type { Contest } from "~/models";

import { useAdmin } from "./provider";

export default function ContestSettings() {
  const { contest, setContest } = useAdmin();

  const save = async (newContest: Partial<Contest>) => {
    await setContest({ ...contest, ...newContest });
  };

  return (
    <Form defaultValue={contest} onSubmit={save} className="!max-w-full">
      <TextAreaField field="instructions" label="Istruzioni gara" rows={8} />
      <SubmitButton>Salva</SubmitButton>
    </Form>
  );
}
