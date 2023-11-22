import React, { ReactNode } from "react";

import { FirebaseOptions } from "firebase/app";

import { FirebaseLogin } from "~/firebase/login";

import TeacherLogin from "./login";

type Props = {
  config: FirebaseOptions;
};

export function TeacherTable({ config }: Props) {
  return (
    <FirebaseLogin config={config}>
      <TeacherLogin>
        <div>Tabella</div>
      </TeacherLogin>
    </FirebaseLogin>
  );
}
