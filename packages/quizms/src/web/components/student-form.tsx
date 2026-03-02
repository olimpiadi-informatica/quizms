import { DateField, Form, NumberField, TextField } from "@olinfo/react-components";

import type { Contest } from "~/models";
import { normalizeName, strip, titleCase } from "~/utils";
import { useStudent } from "~/web/student/context";

export function StudentForm({ printLayout = false }: { printLayout?: boolean }) {
  const { contest, student } = useStudent();

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
          <TextField field="variant" label="Codice prova" placeholder="" />
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
  const commonProps = {
    field: field.name,
    label: field.label,
    placeholder: `Inserisci ${field.label.toLowerCase()}`,
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
