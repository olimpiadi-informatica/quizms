import React, { ReactNode, useCallback } from "react";

import { useTokenAuth } from "./hooks";

type Props = {
  url: string;
  logo?: object;
  children: ReactNode;
};

export default function SsoLogin({ url, logo, children }: Props) {
  const user = useTokenAuth();

  const redirect = new URL(url);
  redirect.searchParams.set("url", window.location.href);

  const Logo = useCallback(
    function Logo() {
      return <img {...logo} className="h-6 w-min" alt="" />;
    },
    [logo],
  );

  if (user) return children;

  return (
    <div className="flex h-full items-center justify-center">
      <a className="btn btn-info" href={redirect.href}>
        <Logo />
        Accedi
      </a>
    </div>
  );
}
