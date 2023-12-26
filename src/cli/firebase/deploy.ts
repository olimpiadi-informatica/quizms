import { existsSync } from "node:fs";

import firebase from "firebase-tools";

export default async function deploy() {
  if (!existsSync("firebase.json")) {
    await firebase.init("hosting");
  }

  await firebase.deploy("", { only: "hosting" });
}
