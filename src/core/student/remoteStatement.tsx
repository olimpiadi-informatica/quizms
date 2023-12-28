import React, { ComponentType, memo, useEffect, useState } from "react";

import { components } from "~/mdx/components";

import { useStudent } from "./provider";

export function RemoteStatement({ url }: { url: string }) {
  const [Statement, setStatement] = useState<ComponentType>();
  const { student } = useStudent();

  useEffect(() => {
    import(/* @vite-ignore */ url).then(({ default: contest }) => {
      setStatement(() =>
        memo(function Statement() {
          return contest(React, components);
        }),
      );
    });
  }, [url]);

  if (Statement) return <Statement />;
  return undefined;
}
