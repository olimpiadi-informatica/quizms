import React, { ComponentType, memo, useEffect, useState } from "react";

import { components } from "~/mdx/components";

export function RemoteStatement({ url }: { url: string }) {
  const [Statement, setStatement] = useState<ComponentType>();

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
