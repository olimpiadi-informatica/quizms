import { existsSync } from "node:fs";
import { chdir } from "node:process";

import firebase from "firebase-tools";

import { loadServiceAccountKey } from "./common";

type DeployOptions = {
  dir: string;
};

export default async function deploy(options: DeployOptions) {
  loadServiceAccountKey(options.dir);

  chdir(options.dir);
  if (!existsSync("firebase.json")) {
    await firebase.init("hosting");
  }

  await firebase.deploy("", { only: "hosting" });
}
