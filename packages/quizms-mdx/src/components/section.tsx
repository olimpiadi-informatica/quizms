import { Children, type ReactNode } from "react";

import { Rng } from "@olinfo/quizms/utils";

import { SectionClient } from "./client/section";
import { JsonField, JsonObject } from "./json";

export type SectionProps = {
  children: ReactNode;
  problemIds: number[];
};

export function Section({ children, problemIds }: SectionProps) {
  const rng = new Rng(`${process.env.QUIZMS_VARIANT_HASH}-${problemIds}`);
  const childrenArray = Children.toArray(children);
  rng.shuffle(childrenArray);
  return (
    <SectionClient problemIds={problemIds}>
      {childrenArray.map((child, i) => {
        return (
          <JsonObject key={i}>
            <JsonField field="id" value={problemIds[i].toString()} />
            {child}
          </JsonObject>
        );
      })}
    </SectionClient>
  );
}
Section.displayName = "Section";
