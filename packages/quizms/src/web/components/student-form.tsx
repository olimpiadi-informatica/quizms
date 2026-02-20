import { DateField, Form, NumberField, TextField } from "@olinfo/react-components";

import type { Contest } from "~/models";
import { titleCase } from "~/utils";
import { useStudent } from "~/web/student/context";

export function StudentForm({ printLayout = false }: { printLayout?: boolean }) {
  const { contest, student } = useStudent();

  return (
    <Form
      defaultValue={{ variant: student.variant, ...student.userData }}
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
    return (
      <TextField
        {...commonProps}
        pattern={field.pattern}
        validationErrorMap={{ patternMismatch: field.patternMismatch }}
        refine={field.title ? (s) => titleCase(s) : undefined}
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
