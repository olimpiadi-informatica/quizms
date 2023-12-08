import React, { ComponentType, useEffect, useState } from "react";

import { components } from "~/ui/mdxComponents";

import { useStudent } from "./provider";

export function PrintableContest() {
  const [Contest, setContest] = useState<ComponentType>();
  const student = useStudent();

  useEffect(() => {
    import(/* @vite-ignore */ `/variant.js?variant=${student.variant}`).then(
      ({ default: contest }) => {
        setContest(() => contest(React, components));
      },
    );
  }, [student.variant]);

  if (Contest) return Contest;
  return <></>;
}
