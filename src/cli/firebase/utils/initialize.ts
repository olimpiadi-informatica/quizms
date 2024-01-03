import { existsSync } from "node:fs";
import { join } from "node:path";

import { App, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { ServiceAccountCredential } from "firebase-admin/lib/app/credential-internal";
import { getStorage } from "firebase-admin/storage";

import { fatal } from "~/cli/utils/logs";

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

export async function getFirebaseBucket(app: App) {
  const credential = app.options.credential as ServiceAccountCredential;
  const token = await credential?.getAccessToken();
  if (!token) {
    fatal("Failed to get access token from credential.");
  }

  let bucketName: string;
  try {
    const resp = await fetch(
      `https://firebase.googleapis.com/v1beta1/projects/${credential.projectId}`,
      {
        headers: {
          Authorization: `Bearer ${token.access_token}`,
        },
      },
    );

    const data = await resp.json();
    bucketName = data.resources.storageBucket;
  } catch (e) {
    fatal(`Failed to get project information: ${e}`);
  }

  const storage = getStorage(app);
  return storage.bucket(bucketName);
}
