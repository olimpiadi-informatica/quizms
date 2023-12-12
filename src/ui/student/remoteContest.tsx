import React, { ComponentType, memo, useEffect, useState } from "react";

import { components } from "~/ui/mdxComponents";

import { useStudent } from "./provider";

export function RemoteContest({ url }: { url: string }) {
  const [Contest, setContest] = useState<ComponentType>();
  const { student } = useStudent();

  const variantUrl = new URL(url, import.meta.url);
  if (variantUrl.protocol !== "blob:") {
    variantUrl.searchParams.set("variant", student.variant ?? "0");
  }

  useEffect(() => {
    import(/* @vite-ignore */ variantUrl.href).then(({ default: contest }) => {
      setContest(() =>
        memo(function Contest() {
          return contest(React, components);
        }),
      );
    });
  }, [variantUrl.href]);

  if (Contest) return <Contest />;
  return undefined;
}
