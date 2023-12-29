import { existsSync } from "node:fs";
import { join } from "node:path";

import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import { fatal } from "../utils/logs";

export function loadServiceAccountKey(dir: string) {
  const path = join(dir, "serviceAccountKey.json");

  if (!existsSync(path)) {
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

  process.env.GOOGLE_APPLICATION_CREDENTIALS = path;
}

export async function initializeDb(dir: string) {
  loadServiceAccountKey(dir);
  const app = initializeApp();
  const db = getFirestore(app);
  db.settings({ ignoreUndefinedProperties: true });

  return [app, db] as const;
}
