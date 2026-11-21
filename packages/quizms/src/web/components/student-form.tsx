import { useLingui } from "@lingui/react/macro";
import { DateField, Form, NumberField, TextField } from "@olinfo/react-components";

import type { Contest } from "~/models";
import { normalizeName, strip, titleCase } from "~/utils";
import { useStudent } from "~/web/student/context";

export function StudentForm({ printLayout = false }: { printLayout?: boolean }) {
  const { contest, student } = useStudent();
  // In the UI language, which is the statement language (also in printed booklets).
  const { t } = useLingui();
  const variantLabel = t`Test code`;

  return (
    <Form
      defaultValue={{ variant: student.variantId, ...student.userData }}
      onSubmit={() => {}}
      className="!max-w-full !flex-row flex-wrap *:basis-1/2 odd:*:pr-2 even:*:pl-2"
      disabled>
      {contest.userData.map((field) => (
        <div key={field.name}>
          <StudentFormField field={field} printLayout={printLayout} />
        </div>
      ))}
      {contest.hasVariants && (
        <div>
          <TextField field="variant" label={variantLabel} placeholder="" />
        </div>
      )}
    </Form>
  );
}

export function StudentFormField({
  field,
  printLayout,
}: {
  field: Contest["userData"][number];
  printLayout?: boolean;
}) {
  const { t } = useLingui();
  const label = field.label.toLowerCase();
  const commonProps = {
    field: field.name,
    label: field.label,
    placeholder: t`Enter ${label}`,
  };
  if (printLayout) {
    return <TextField {...commonProps} />;
  }
  if (field.type === "text") {
    const refine =
      field.name === "name"
        ? (s: string) => normalizeName(s)
        : field.title
          ? (s: string) => titleCase(s)
          : (s: string) => strip(s);
    return (
      <TextField
        {...commonProps}
        pattern={field.pattern}
        validationErrorMap={{ patternMismatch: field.patternMismatch }}
        refine={refine}
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
