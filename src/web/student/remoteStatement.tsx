import React, { memo } from "react";

import { isFunction } from "lodash-es";
import useSWR from "swr/immutable";

import { components } from "~/mdx/components";

type Props =
  | {
      id?: undefined;
      url: string;
    }
  | {
      id: string;
      url: () => string | Promise<string>;
    };

export function RemoteStatement({ id, url }: Props) {
  const { data: Statement } = useSWR(id, () => fetcher(url), {
    suspense: true,
  });

  return <Statement />;
}

async function fetcher(url: Props["url"]) {
  if (isFunction(url)) url = await url();
  const { default: statement } = await import(/* @vite-ignore */ url);

  return memo(function Statement() {
    return statement(React, components);
  });
}