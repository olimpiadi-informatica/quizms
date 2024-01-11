import { existsSync } from "node:fs";
import { cp, mkdir, writeFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { Bucket } from "@google-cloud/storage";
import { App } from "firebase-admin/app";
import pc from "picocolors";

import { confirm, error, info, success } from "~/cli/utils/logs";

import firestoreIndexes from "./files/firestore-indexes.json";
import firestoreRules from "./files/firestore.rules";
import storageRules from "./files/storage.rules";
import { initializeFirebase } from "./utils/initialize";
import restApi from "./utils/rest-api";

type InitOptions = {
  dir: string;
  force?: boolean;
};

export default async function init(options: InitOptions) {
  let initialized = true;

  if (await copyFiles(options)) initialized = false;

  const { app, bucket } = await initializeFirebase(options.dir);
  if (await enableBackups(app)) initialized = false;
  if (await enableCors(bucket)) initialized = false;

  if (initialized) {
    success(`Project initialized!`);
  } else {
    error(`The initialization was not completed due to some previous errors.`);
  }
}

async function copyFiles(options: InitOptions) {
  info(`Copying files...`);

  const data = join(options.dir, "firebase");
  await mkdir(data, { recursive: true });

  const firestoreRulesPath = join(data, "firestore.rules");
  if (await overwrite(firestoreRulesPath, options)) {
    const from = fileURLToPath(new URL(firestoreRules, import.meta.url));
    await cp(from, firestoreRulesPath);
  }

  const firestoreIndexesPath = join(data, "firestore-indexes.json");
  if (await overwrite(firestoreIndexesPath, options)) {
    await writeFile(firestoreIndexesPath, JSON.stringify(firestoreIndexes, null, 2));
  }

  const storageRulesPath = join(data, "storage.rules");
  if (await overwrite(storageRulesPath, options)) {
    const from = fileURLToPath(new URL(storageRules, import.meta.url));
    await cp(from, storageRulesPath);
  }

  const configPath = join(options.dir, "firebase.json");
  const configs = {
    hosting: {
      public: "dist",
      ignore: ["firebase.json", "**/.*", "**/node_modules/**"],
    },
    firestore: {
      rules: relative(options.dir, firestoreRulesPath),
      indexes: relative(options.dir, firestoreIndexesPath),
    },
    storage: {
      rules: relative(options.dir, storageRulesPath),
    },
  };

  if (await overwrite(configPath, options)) {
    await writeFile(configPath, JSON.stringify(configs, null, 2));
  }

  success(`Files copied!`);
  return 0;
}

async function enableBackups(app: App) {
  info(`Enabling Firestore backups...`);

  try {
    await restApi(app, "firestore", "v1", "/databases/(default)/backupSchedules", {
      dailyRecurrence: {},
      retention: "604800s",
    });
    await restApi(app, "firestore", "v1", "/databases/(default)/backupSchedules", {
      weeklyRecurrence: {
        day: "SUNDAY",
      },
      retention: "8467200s",
    });
    success(`Backups enabled!`);
    return 0;
  } catch (e) {
    error(`Failed to enable Firestore backups: ${e}`);
    return 1;
  }
}

async function enableCors(bucket: Bucket) {
  info(`Enabling CORS for Firebase bucket...`);

  try {
    await bucket.setCorsConfiguration([
      {
        origin: ["*"],
        method: ["GET"],
        maxAgeSeconds: 3600,
      },
    ]);
    success(`CORS enabled!`);
    return 0;
  } catch (e) {
    error(`Failed to set CORS configuration: ${e}`);
    return 1;
  }
}

async function overwrite(dest: string, options?: InitOptions) {
  if (options?.force || !existsSync(dest)) return true;
  return await confirm(
    `The file ${pc.bold(basename(dest))} already exists. Do you want to overwrite it?`,
    false,
  );
}
