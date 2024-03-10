import React, { ReactNode, useCallback } from "react";

import { Button } from "~/components/button";

import { useTokenAuth } from "./hooks";

type Props = {
  url: string;
  logo?: object;
  children: ReactNode;
};

export default function SsoLogin({ url, logo, children }: Props) {
  const user = useTokenAuth();

  const login = () => {
    const redirect = new URL(url);
    redirect.searchParams.set("url", window.location.href);
    window.location.replace(redirect);

    return new Promise<void>(() => {});
  };

  const Logo = useCallback(
    function Logo() {
      return <img {...logo} className="h-6 w-min" alt="" />;
    },
    [logo],
  );

  if (user) return children;

  return (
    <div className="flex h-full items-center justify-center">
      <Button className="btn-info" icon={Logo} onClick={login}>
        Accedi
      </Button>
    </div>
  );
}
