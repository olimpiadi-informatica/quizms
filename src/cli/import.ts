import { pbkdf2Sync, randomBytes } from "node:crypto";
import { createReadStream } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { pipeline } from "node:stream/promises";

import { parse } from "csv";
import { deleteApp, initializeApp } from "firebase/app";
import { CollectionReference, collection, doc, getFirestore, setDoc } from "firebase/firestore";
import { InlineConfig, build, mergeConfig } from "vite";

import { encode } from "~/firebase/statement-encode";
import {
  Metadata,
  Solutions,
  User,
  UserSchema,
  metadataConverter,
  passwordConverter,
  statementConverter,
  userConverter,
} from "~/firebase/types";
import { parseContest } from "~/jsx-runtime/parser";

import configs from "./vite/configs";

type ImportProps = {
  dir: string;
  outDir: string;
  contest: string;
  secret?: string;
  file: string;
};

export default async function importContest(options: ImportProps) {
  const salt = Buffer.from("a4576dd74c98e90e2c69e9e3e9e6605d", "hex");
  const secret = (
    options.secret ? pbkdf2Sync(options.secret, salt, 262144, 32, "sha256") : randomBytes(32)
  ).toString("hex");

  const contestSource = await buildBase(options);
  const { default: contestEntry } = await import(contestSource);

  const db = await initFirebase();

  await pipeline(
    createReadStream(join(options.dir, options.file)),
    parse({ columns: true }),
    async function (source) {
      const promises: Promise<void>[] = [];

      for await (const record of source) {
        const user = UserSchema.parse(record);
        const userRef = doc(db, "users", user.token);
        await setDoc(userRef.withConverter(userConverter), user);

        if (user.role === "student") {
          promises.push(importStudent(collection(userRef, "contest"), user, contestEntry, secret));
        }
      }

      await Promise.all(promises);
    },
  );

  await deleteApp(db.app);
}

async function initFirebase() {
  const config = {
    apiKey: process.env.API_KEY,
    authDomain: process.env.AUTH_DOMAIN,
    projectId: process.env.PROJECT_ID,
  };

  const app = initializeApp(config);
  return getFirestore(app);
}

async function buildBase(options: ImportProps): Promise<string> {
  process.env.QUIZMS_MODE = "contest";

  const defaultConfig = configs("production", {
    mdx: {
      providerImportSource: "quizms/jsx-runtime",
      jsxImportSource: "quizms",
    },
  });

  const outDir = join(options.dir, options.outDir);
  const fileName = "base-contest";

  const bundleConfig: InlineConfig = {
    root: join(options.dir, "src"),
    build: {
      copyPublicDir: false,
      outDir,
      emptyOutDir: true,
      lib: {
        entry: options.contest,
        fileName,
        formats: ["es"],
      },
      minify: false,
    },
  };

  await build(mergeConfig(defaultConfig, bundleConfig));

  return join(outDir, `${fileName}.mjs`);
}

async function importStudent(
  userRef: CollectionReference,
  user: User,
  contestEntry: () => any,
  secret: string,
) {
  const key = Uint8Array.from(randomBytes(32));

  const contest = parseContest(contestEntry, `${secret}-${user.token}`);
  const statement = await encode(contest, key);

  await setDoc(doc(userRef, "statement").withConverter(statementConverter), statement);

  await setDoc(doc(userRef, "password").withConverter(passwordConverter), key);

  await setDoc(doc(userRef, "solutions"), {} as Solutions);

  await setDoc(doc(userRef, "meta").withConverter(metadataConverter), {
    startingTime: new Date("2023-11-15T10:00:00"),
    endingTime: new Date("2024-11-15T10:00:00"),
  } as Metadata);

  console.log(`\x1b[1;32m✓\x1b[0m user ${user.token} imported`);
}
