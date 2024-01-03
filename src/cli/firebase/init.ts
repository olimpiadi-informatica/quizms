import { existsSync } from "node:fs";
import { cp, mkdir, writeFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import pc from "picocolors";

import { confirm, success } from "~/cli/utils/logs";

import firestoreIndexs from "./files/firestore-indexes.json";
// @ts-expect-error: resolved using esbuild file loader
import firestoreRules from "./files/firestore.rules";
import storageCors from "./files/storage-cors.json";
// @ts-expect-error: resolved using esbuild file loader
import storageRules from "./files/storage.rules";

type InitOptions = {
  dir: string;
};

export default async function init(options: InitOptions) {
  const data = join(options.dir, "firebase");
  await mkdir(data, { recursive: true });

  const firestoreRulesPath = join(data, "firestore.rules");
  if (await overwrite(firestoreRulesPath)) {
    const from = fileURLToPath(new URL(firestoreRules, import.meta.url));
    await cp(from, firestoreRulesPath);
  }

  const firestoreIndexesPath = join(data, "firestore-indexes.json");
  if (await overwrite(firestoreIndexesPath)) {
    await writeFile(firestoreIndexesPath, JSON.stringify(firestoreIndexs, null, 2));
  }

  const storageRulesPath = join(data, "storage.rules");
  if (await overwrite(storageRulesPath)) {
    const from = fileURLToPath(new URL(storageRules, import.meta.url));
    await cp(from, storageRulesPath);
  }

  const storageCorsPath = join(data, "storage-cors.json");
  if (await overwrite(storageCorsPath)) {
    await writeFile(storageCorsPath, JSON.stringify(storageCors, null, 2));
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

  if (await overwrite(configPath)) {
    await writeFile(configPath, JSON.stringify(configs, null, 2));
  }

  success(`Project initialized!`);
}

async function overwrite(dest: string) {
  if (!existsSync(dest)) return true;
  return await confirm(
    `The ${pc.bold(basename(dest))} file already exists. Do you want to overwrite it?`,
    false,
  );
}
