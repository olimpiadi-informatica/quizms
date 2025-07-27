import { useLingui } from "@lingui/react/macro";
import { DateField, Form, NumberField, TextField } from "@olinfo/react-components";

import type { Contest } from "~/models";
import { useStudent } from "~/web/student/context";

export function UserDataForm() {
  const { contest, student } = useStudent();
  const { t } = useLingui();

  return (
    <Form
      defaultValue={{ variant: student.variant, ...student.userData }}
      onSubmit={() => {}}
      className="!max-w-full !flex-row flex-wrap *:basis-1/2 odd:*:pr-2 even:*:pl-2"
      disabled>
      {contest.userData.map((field) => (
        <div key={field.name}>
          <UserDataField field={field} />
        </div>
      ))}
      {contest.hasVariants && (
        <div>
          <TextField field="variant" label={t`Variant code`} placeholder={t`Enter variant code`} />
        </div>
      )}
    </Form>
  );
}

export function UserDataField({ field }: { field: Contest["userData"][number] }) {
  const { t } = useLingui();
  const commonProps = {
    field: field.name,
    label: field.label,
    placeholder: t`Enter ${field.label.toLowerCase()}`,
  };
  if (field.type === "text" || process.env.QUIZMS_MODE === "print") {
    return (
      <TextField
        {...commonProps}
        pattern="[\-'\s\p{Alpha}]+"
        validationErrorMap={{
          patternMismatch: t`This field cannot contain numbers or symbols.`,
        }}
      />
    );
  }
  if (field.type === "date") {
    return <DateField {...commonProps} min={field.min} max={field.max} />;
  }
  if (field.type === "number") {
    return <NumberField {...commonProps} min={field.min} max={field.max} />;
  }
}
