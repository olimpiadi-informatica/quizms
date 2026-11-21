import { Trans, useLingui } from "@lingui/react/macro";
import type { Contest } from "@olinfo/quizms/models";
import { Form, SelectField, SubmitButton, TextAreaField } from "@olinfo/react-components";

import { useAdmin } from "./context";

export default function ContestSettings() {
  const { t } = useLingui();
  const { contest, setContest } = useAdmin();

  const save = async (newContest: Pick<Contest, "instructions" | "scoreVisibility">) => {
    await setContest({ ...contest, ...newContest });
  };

  return (
    <Form key={contest.id} defaultValue={contest} onSubmit={save} className="!max-w-full">
      <SelectField
        field="scoreVisibility"
        label={t`Show scores`}
        options={{
          never: t`Never`,
          always: t`Always`,
          finalized: t`Only to finalized schools`,
        }}
      />
      <TextAreaField
        field="instructions"
        label={t`Contest instructions`}
        rows={8}
        optional={true}
      />
      <SubmitButton>
        <Trans>Save</Trans>
      </SubmitButton>
    </Form>
  );
}
