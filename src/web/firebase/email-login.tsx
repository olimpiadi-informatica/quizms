import React, { ReactNode, useState } from "react";

import { startCase } from "lodash-es";

import { Button } from "~/components/button";

import { usePrecompiledPasswordAuth, useSignInWithPassword } from "./hooks";

type Props = {
  method: "email" | "username";
  children: ReactNode;
};

export default function EmailLogin({ method, children }: Props) {
  const { signInWithPassword, error } = useSignInWithPassword();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const signIn = () =>
    signInWithPassword(method === "email" ? username : `${username}@teacher.edu`, password);

  const user = usePrecompiledPasswordAuth();

  if (user?.emailVerified) {
    return children;
  }

  const message = error?.message.match(/^Firebase: (.*) \([/a-z-]+\)\.$/)?.[1] || error?.message;

  return (
    <div className="my-8 flex justify-center">
      <form className="max-w-md grow p-4">
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text text-lg">{startCase(method)}</span>
          </label>
          <input
            type="text"
            autoComplete={method}
            placeholder={`Inserisci ${method === "email" ? "l'email" : "lo username"}`}
            className="input input-bordered w-full max-w-md"
            onChange={(e) => setUsername(e.target.value)}
            value={username}
          />
        </div>
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text text-lg">Password</span>
          </label>
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Insersci la password"
            className="input input-bordered w-full max-w-md"
            onChange={(e) => setPassword(e.target.value)}
            value={password}
          />
        </div>
        <span className="pt-1 text-error">{message || <>&nbsp;</>}</span>
        <div className="flex justify-center pt-3">
          <Button className="btn-success" onClick={signIn}>
            Accedi
          </Button>
        </div>
      </form>
    </div>
  );
}
