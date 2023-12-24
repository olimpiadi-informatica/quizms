import React, { ComponentType, memo, useEffect, useState } from "react";

import { components } from "~/mdx/components";

import { useStudent } from "./provider";

export function RemoteStatement({ url }: { url: string }) {
  const [Statement, setStatement] = useState<ComponentType>();
  const { student } = useStudent();

  const variantUrl = new URL(url, import.meta.url);
  if (variantUrl.protocol !== "blob:") {
    variantUrl.searchParams.set("variant", student.variant ?? "0");
  }

  useEffect(() => {
    import(/* @vite-ignore */ variantUrl.href).then(({ default: contest }) => {
      setStatement(() =>
        memo(function Statement() {
          return contest(React, components);
        }),
      );
    });
  }, [variantUrl.href]);

  if (Statement) return <Statement />;
  return undefined;
}
