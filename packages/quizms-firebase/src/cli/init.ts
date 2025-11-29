import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { cwd } from "node:process";

import type { Bucket } from "@google-cloud/storage";
import { confirm, select } from "@inquirer/prompts";
import { error, info, success } from "@olinfo/quizms/utils-node";
import { type App, deleteApp, initializeApp } from "firebase-admin/app";
import pc from "picocolors";

import firestoreRules from "./files/firestore.rules?raw";
import firestoreIndexes from "./files/firestore-indexes.json";
import storageRules from "./files/storage.rules?raw";
import { initializeFirebase } from "./utils/initialize";
import { restApi, restProjectApi } from "./utils/rest-api";

type InitOptions = {
  force?: boolean;
};

export default async function init(options: InitOptions) {
  let initialized = true;

  await selectProject();

  if (await copyFiles(options)) initialized = false;

  const { app, bucket } = await initializeFirebase();
  if (await enableBackups(app)) initialized = false;
  if (await enableCors(bucket)) initialized = false;

  if (initialized) {
    success("Project initialized!");
  } else {
    error("The initialization was not completed due to some previous errors.");
  }
}

async function selectProject() {
  const app = initializeApp();
  const data = await restApi(app, "firebase", "v1beta1", "");
  await deleteApp(app);

  const answer = await select({
    message: "Seleziona il progetto Firebase",
    choices: data.results.map((project: any) => ({
      value: project.projectId,
      name: project.displayName,
    })),
  });
  await writeFile(".firebaserc", JSON.stringify({ projects: { default: answer } }, null, 2));
}

async function copyFiles(options: InitOptions) {
  info("Copying files...");

  await mkdir("firebase", { recursive: true });

  const firestoreRulesPath = "firebase/firestore.rules";
  await initFile(firestoreRulesPath, firestoreRules, options);

  const firestoreIndexesPath = "firebase/firestore-indexes.json";
  await initFile(firestoreIndexesPath, JSON.stringify(firestoreIndexes, undefined, 2), options);

  const storageRulesPath = "firebase/storage.rules";
  await initFile(storageRulesPath, storageRules, options);

  // See {@link https://github.com/firebase/firebase-tools/blob/09c2641e861f2e31798dfb4aba1a180e8fd08ea5/src/firebaseConfig.ts#L244 here}.
  const configs = {
    hosting: hostingConfigs(),
    firestore: {
      rules: path.relative(cwd(), firestoreRulesPath),
      indexes: path.relative(cwd(), firestoreIndexesPath),
    },
    storage: {
      rules: path.relative(cwd(), storageRulesPath),
    },
    functions: [
      {
        codebase: "default",
        disallowLegacyRuntimeConfig: true,
        ignore: ["node_modules", "*.log"],
        source: "firebase/functions",
      },
    ],
  };
  await initFile("firebase.json", JSON.stringify(configs, undefined, 2), options);

  success("Files copied!");
  return 0;
}

function hostingConfigs() {
  return {
    public: ".quizms/hosting-build",
    ignore: ["firebase.json", "**/.*", "**/node_modules/**"],
    rewrites: [
      {
        source: "**",
        destination: "/index.html",
      },
    ],
    trailingSlash: false,
    headers: [
      {
        source: "/assets/**",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable", // 365 days
          },
        ],
      },
      {
        source: "/blockly/**",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400", // 1 day
          },
        ],
      },
    ],
    predeploy: "npx quizms build",
  };
}

async function enableBackups(app: App) {
  info("Enabling Firestore backups...");

  try {
    await restProjectApi(app, "firestore", "v1", "/databases/(default)/backupSchedules", {
      dailyRecurrence: {},
      retention: "604800s",
    });
    await restProjectApi(app, "firestore", "v1", "/databases/(default)/backupSchedules", {
      weeklyRecurrence: {
        day: "SUNDAY",
      },
      retention: "8467200s",
    });
    success("Backups enabled!");
    return 0;
  } catch (err) {
    error(`Failed to enable Firestore backups: ${err}`);
    return 1;
  }
}

async function enableCors(bucket: Bucket) {
  info("Enabling CORS for Firebase bucket...");

  try {
    await bucket.setCorsConfiguration([
      {
        origin: ["*"],
        method: ["GET"],
        maxAgeSeconds: 3600,
      },
    ]);
    success("CORS enabled!");
    return 0;
  } catch (err) {
    error(`Failed to set CORS configuration: ${err}`);
    return 1;
  }
}

async function initFile(fileName: string, content: string, options?: InitOptions) {
  let write = options?.force ?? false;
  if (!write) {
    try {
      const prevContent = await readFile(fileName, "utf8");
      if (prevContent === content) return;
    } catch {
      write = true;
    }
  }

  if (!write) {
    write = await confirm({
      message: `The file ${pc.bold(path.basename(fileName))} already exists. Do you want to overwrite it?`,
    });
  }

  if (write) {
    await writeFile(fileName, content);
  }
}
