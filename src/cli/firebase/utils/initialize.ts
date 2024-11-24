import { existsSync } from "node:fs";

import { type App, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

import { fatal } from "~/utils/logs";

import { readFile } from "node:fs/promises";
import restApi from "./rest-api";

export async function initializeFirebase() {
  await setProjectId();
  const app = initializeApp();
  const db = getFirestore(app);
  db.settings({ ignoreUndefinedProperties: true });

  const bucket = await getFirebaseBucket(app);

  return { app, db, bucket };
}

async function setProjectId() {
  if (!existsSync(".firebaserc")) {
    fatal("No project selected. Run `firebase use --add` first.");
  }

  const data = JSON.parse(await readFile(".firebaserc", "utf-8"));
  const projectId = Object.values(data.projects)[0] as string;
  if (!projectId) {
    fatal("Failed to get project ID from .firebaserc.");
  }

  process.env.PROJECT_ID = projectId;
}

async function getFirebaseBucket(app: App) {
  let bucketName: string;
  try {
    const data = await restApi(app, "firebasestorage", "v1beta", "/buckets");
    bucketName = data.buckets[0].name;
  } catch (err) {
    fatal(`Failed to get project information: ${err}`);
  }

  if (!bucketName) {
    fatal("Failed to get storage bucket name. Maybe sure you have initialized Firebase Storage.");
  }

  const storage = getStorage(app);
  return storage.bucket(bucketName.replace(/.*\//, ""));
}
