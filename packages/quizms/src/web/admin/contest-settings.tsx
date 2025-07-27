import { Trans, useLingui } from "@lingui/react/macro";
import { Form, SubmitButton, TextAreaField } from "@olinfo/react-components";

import type { Contest } from "~/models";

import { useAdmin } from "./context";

export default function ContestSettings() {
  const { contest, setContest } = useAdmin();
  const { t } = useLingui();

  const save = async (newContest: Pick<Contest, "instructions">) => {
    await setContest({ ...contest, ...newContest });
  };

  return (
    <Form key={contest.id} defaultValue={contest} onSubmit={save} className="!max-w-full">
      <TextAreaField field="instructions" label={t`Contest instructions`} rows={8} />
      <SubmitButton>
        <Trans>Save</Trans>
      </SubmitButton>
    </Form>
  );
}
