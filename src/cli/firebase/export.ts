import { mkdir, open } from "node:fs/promises";
import path from "node:path";

import { deleteApp } from "firebase-admin/app";
import type { Query } from "firebase-admin/firestore";
import { capitalize } from "lodash-es";

import { info, success } from "~/utils/logs";

import {
  contestConverter,
  participationConverter,
  participationMappingConverter,
  studentConverter,
  submissionConverter,
  variantConverter,
} from "./utils/converters-admin";
import { initializeFirebase } from "./utils/initialize";

type ExportOptions = {
  contests?: true;
  participations?: true;
  students?: true;
  submissions?: true;
  tokens?: true;
  variants?: true;
};

export default async function exportContests(options: ExportOptions) {
  const { app, db } = await initializeFirebase();

  const timestamp = new Date().toISOString();
  const outDir = path.join("export", timestamp);
  await mkdir(outDir, { recursive: true });

  if (options.students) {
    const ref = db.collectionGroup("students").withConverter(studentConverter);
    await exportCollection(ref, "students", outDir);
  }
  if (options.participations) {
    const ref = db.collection("participations").withConverter(participationConverter);
    await exportCollection(ref, "participations", outDir);
  }
  if (options.submissions) {
    const ref = db.collection("submissions").withConverter(submissionConverter);
    await exportCollection(ref, "submissions", outDir);
  }
  if (options.tokens) {
    const ref = db.collection("participationMapping").withConverter(participationMappingConverter);
    await exportCollection(ref, "tokens", outDir);
  }
  if (options.variants) {
    const ref = db.collection("variants").withConverter(variantConverter);
    await exportCollection(ref, "variants", outDir);
  }
  if (options.contests) {
    const ref = db.collection("contests").withConverter(contestConverter);
    await exportCollection(ref, "contests", outDir);
  }

  await deleteApp(app);
}

async function exportCollection(ref: Query, collection: string, dir: string) {
  info(`Exporting ${collection}.`);

  const chunkSize = 25_000;
  let snapshot = await ref.limit(chunkSize).get();

  const file = await open(path.format({ dir, name: collection, ext: ".jsonl" }), "w");
  let sum = 0;

  while (!snapshot.empty) {
    for (const doc of snapshot.docs) {
      await file.write(`${JSON.stringify(doc.data())}\n`);
    }

    sum += snapshot.size;
    info(`Found ${sum} ${collection}.`);

    const last = snapshot.docs.at(-1);
    snapshot = await ref.startAfter(last).limit(chunkSize).get();
  }

  success(`${capitalize(collection)} export completed.`);
  await file.close();
}
