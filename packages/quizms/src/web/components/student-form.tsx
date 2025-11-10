import { DateField, Form, NumberField, TextField } from "@olinfo/react-components";

import type { Contest } from "~/models";
import { useStudent } from "~/web/student/context";

export function StudentForm() {
  const { contest, student } = useStudent();

  return (
    <Form
      defaultValue={{ variant: student.variant, ...student.userData }}
      onSubmit={() => {}}
      className="!max-w-full !flex-row flex-wrap *:basis-1/2 odd:*:pr-2 even:*:pl-2"
      disabled>
      {contest.userData.map((field) => (
        <div key={field.name}>
          <StudentFormField field={field} />
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

export function StudentFormField({ field }: { field: Contest["userData"][number] }) {
  const commonProps = {
    field: field.name,
    label: field.label,
    placeholder: `Inserisci ${field.label.toLowerCase()}`,
  };
  if (field.type === "text" || process.env.QUIZMS_MODE === "print") {
    return (
      <TextField
        {...commonProps}
        pattern="[\-'\s\p{Alpha}]+"
        validationErrorMap={{ patternMismatch: "Il campo non può contenere numeri o simboli." }}
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
