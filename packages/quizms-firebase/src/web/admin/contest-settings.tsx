import { Trans, useLingui } from "@lingui/react/macro";
import { type Contest, localize } from "@olinfo/quizms/models";
import { Form, SelectField, SubmitButton, TextAreaField } from "@olinfo/react-components";

import { adminUpdateContestSettings } from "~/web/common/api";

import { useAdmin } from "./context";

type Values = { scoreVisibility: Contest["scoreVisibility"] } & Record<string, string | undefined>;

/** Name of the form field with the instructions in `language`. */
const instructionsField = (language: string) => `instructions-${language}`;

export default function ContestSettings() {
  const { t } = useLingui();
  const { contest, user } = useAdmin();

  // The instructions can be translated: multilingual contests have one text per language.
  const languages = contest.languages ?? ["it"];
  const multilingual = languages.length > 1 || typeof contest.instructions === "object";

  const defaultValue: Values = {
    scoreVisibility: contest.scoreVisibility,
    ...(multilingual
      ? Object.fromEntries(
          languages.map((lang) => [instructionsField(lang), localize(contest.instructions, lang)]),
        )
      : { instructions: localize(contest.instructions, languages[0]) }),
  };

  const save = async (values: Values) => {
    let instructions: Contest["instructions"] | null = null;
    if (multilingual) {
      const entries = languages.map((lang) => [
        lang,
        values[instructionsField(lang)]?.trim() ?? "",
      ]);
      const hasAny = entries.some(([, val]) => val.length > 0);
      instructions = hasAny ? Object.fromEntries(entries) : null;
    } else {
      instructions = values.instructions?.trim() || null;
    }
    await adminUpdateContestSettings(user, {
      contestId: contest.id,
      settings: {
        scoreVisibility: values.scoreVisibility,
        instructions,
      },
    });
  };

  return (
    <Form key={contest.id} defaultValue={defaultValue} onSubmit={save} className="!max-w-full">
      <SelectField
        field="scoreVisibility"
        label={t`Show scores`}
        options={{
          never: t`Never`,
          always: t`Always`,
          finalized: t`Only to finalized schools`,
        }}
      />
      {multilingual ? (
        languages.map((lang) => {
          const language = lang.toUpperCase();
          return (
            <TextAreaField
              key={lang}
              field={instructionsField(lang)}
              label={t`Contest instructions (${language})`}
              rows={8}
              optional={true}
            />
          );
        })
      ) : (
        <TextAreaField
          field="instructions"
          label={t`Contest instructions`}
          rows={8}
          optional={true}
        />
      )}
      <SubmitButton>
        <Trans>Save</Trans>
      </SubmitButton>
    </Form>
  );
}
