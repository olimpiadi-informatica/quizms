import { DateField, Form, NumberField, TextField } from "@olinfo/react-components";

import type { Contest } from "~/models";
import { normalizeName, statementString, strip, titleCase } from "~/utils";
import { useStudent } from "~/web/student/context";
import { useStatementLanguageContext } from "~/web/student/language";

export function StudentForm({ printLayout = false }: { printLayout?: boolean }) {
  const { contest, student } = useStudent();
  // Printed booklets are in the statement language; the online form is part of the (Italian) UI.
  const language = useStatementLanguageContext();
  const variantLabel = printLayout ? statementString(language, "variantCode") : "Codice prova";

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
  const language = useStatementLanguageContext();
  const enter = printLayout ? statementString(language, "enter") : "Inserisci";
  const commonProps = {
    field: field.name,
    label: field.label,
    placeholder: `${enter} ${field.label.toLowerCase()}`,
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
