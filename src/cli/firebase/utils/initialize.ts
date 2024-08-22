import { existsSync } from "node:fs";
import path from "node:path";

import { type App, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

import { fatal } from "~/utils/logs";

import restApi from "./rest-api";

export function loadServiceAccountKey(dir: string) {
  const fileName = path.join(dir, "serviceAccountKey.json");

  if (!existsSync(fileName)) {
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

  process.env.GOOGLE_APPLICATION_CREDENTIALS = fileName;
}

export async function initializeFirebase(dir: string) {
  loadServiceAccountKey(dir);
  const app = initializeApp();
  const db = getFirestore(app);
  db.settings({ ignoreUndefinedProperties: true });

  const bucket = await getFirebaseBucket(app);

  return { app, db, bucket };
}

async function getFirebaseBucket(app: App) {
  let bucketName: string;
  try {
    const data = await restApi(app, "firebase", "v1beta1", "");
    bucketName = data.resources.storageBucket;
  } catch (err) {
    fatal(`Failed to get project information: ${err}`);
  }

  if (!bucketName) {
    fatal("Failed to get storage bucket name. Maybe sure you have initialized Firebase Storage.");
  }

  const storage = getStorage(app);
  return storage.bucket(bucketName);
}
