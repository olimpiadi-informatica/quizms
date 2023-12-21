import { existsSync } from "node:fs";

import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import { fatal } from "../utils/logs";

export function loadServiceAccountKey() {
  if (!existsSync("serviceAccountKey.json")) {
    fatal(`\
Il file con le credenziali di Firebase non è stato trovato.

Per generare il file:
 • accedi alla console di firebase;
 • vai sulle impostazioni del progetto;
 • vai nella sezione "Account di servizio";
 • clicca su "Genera nuova chiave privata";
 • salva il file con il nome "serviceAccountKey.json" nella cartella corrente;
 • NON aggiungere il file a git, aggiungilo nel .gitignore qualora non fosse già presente.\
`);
  }

  process.env.GOOGLE_APPLICATION_CREDENTIALS = "serviceAccountKey.json";
}

export async function initializeDb() {
  loadServiceAccountKey();
  const app = initializeApp();
  const db = getFirestore(app);
  db.settings({ ignoreUndefinedProperties: true });

  return [app, db] as const;
}
