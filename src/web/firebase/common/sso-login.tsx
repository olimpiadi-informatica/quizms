import { type ReactNode, useEffect, useMemo, useState } from "react";

import { Navbar } from "@olinfo/react-components";
import clsx from "clsx";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import { useLocation, useSearch } from "wouter";

import { useAuth } from "~/web/firebase/hooks";

import { useDb } from "./base-login";

type Props = {
  url: string;
  logo?: object;
  children: ReactNode;
};

export default function SsoLogin({ url, logo, children }: Props) {
  const db = useDb();
  const auth = getAuth(db.app);
  const user = useAuth();

  const [location, navigate] = useLocation();
  const search = useSearch();

  const token = useMemo(() => {
    const params = new URLSearchParams(search);
    return params.get("token");
  }, [search]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      setLoading(true);
      signInWithCustomToken(auth, token)
        .then(() => navigate(location, { replace: true }))
        .finally(() => setLoading(false));
    }
  }, [token, auth, location, navigate]);

  const redirect = useMemo(() => {
    const redirect = new URL(url);
    redirect.searchParams.set("url", window.location.href);
    return redirect;
  }, [url]);

  if (user) return children;

  return (
    <>
      <Navbar color="bg-base-300 text-base-content">
        <div className="btn btn-ghost no-animation cursor-auto">Olimpiadi di Informatica</div>
      </Navbar>
      <div className="flex grow flex-col items-center justify-center gap-4 p-4 pb-8">
        <h1 className="text-xl font-bold">Accedi usando le tue credenziali di {redirect.host}</h1>
        <a className={clsx("btn btn-info", loading && "btn-disabled")} href={redirect.href}>
          {loading ? (
            <span className="loading loading-spinner" />
          ) : (
            <img {...logo} className="h-6 w-min" alt="" />
          )}
          Accedi
        </a>
      </div>
    </>
  );
}
