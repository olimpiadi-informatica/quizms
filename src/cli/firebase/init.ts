import { existsSync } from "node:fs";
import { cp, mkdir, writeFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import pc from "picocolors";

import { confirm, success } from "~/cli/utils/logs";
import indexes from "~/firebase/firestore-indexes.json";
// @ts-expect-error: resolved using esbuild file loader
import rules from "~/firebase/firestore.rules";

type InitOptions = {
  dir: string;
};

export default async function init(options: InitOptions) {
  const data = join(options.dir, "data");
  await mkdir(data, { recursive: true });

  const rulesPath = join(data, "firestore.rules");
  if (await overwrite(rulesPath)) {
    const from = fileURLToPath(new URL(rules, import.meta.url));
    await cp(from, rulesPath);
  }

  const indexesPath = join(data, "firestore-indexes.json");
  if (await overwrite(indexesPath)) {
    await writeFile(indexesPath, JSON.stringify(indexes, null, 2));
  }

  const configPath = join(options.dir, "firebase.json");
  const configs = {
    hosting: {
      public: "dist",
      ignore: ["firebase.json", "**/.*", "**/node_modules/**"],
    },
    firestore: {
      rules: relative(options.dir, rulesPath),
      indexes: relative(options.dir, indexesPath),
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
