import type { ReactNode } from "react";

type Primitive = string | number | boolean | null;

export function JsonField({
  field,
  value,
  children,
}: {
  field: string;
  value?: Primitive;
  children?: ReactNode;
}) {
  return (
    <>
      <Token value={`${JSON.stringify(field)}:`} />
      {value !== undefined && <Token value={`${JSON.stringify(value)},`} />}
      {children}
    </>
  );
}

export function JsonObject({ children }: { children: ReactNode }) {
  return (
    <>
      <Token value="{" />
      {children}
      <Token value="}," />
    </>
  );
}

export function JsonArray({ children }: { children: ReactNode }) {
  return (
    <>
      <Token value="[" />
      {children}
      <Token value="]," />
    </>
  );
}

export function Token({ value }: { value: string }) {
  if (process.env.QUIZMS_MODE === "contest") console.log(value);
  return null;
}
