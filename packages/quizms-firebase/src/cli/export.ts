import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";

import { info, success } from "@olinfo/quizms/utils-node";
import { SingleBar } from "cli-progress";
import { formatDistanceStrict } from "date-fns";
import { deleteApp } from "firebase-admin/app";
import type { Query, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { capitalize } from "lodash-es";

import {
  contestConverter,
  participationConverter,
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
  if (options.variants) {
    const ref = db.collection("variants").withConverter(variantConverter);
    await exportCollection(ref, "variants", outDir);
  }
  if (options.contests) {
    const ref = db.collection("contests").withConverter(contestConverter);
    await exportCollection(ref, "contests", outDir);
  }
  if (options.submissions) {
    const ref = db.collection("submissions").withConverter(submissionConverter);
    await exportCollection(ref, "submissions", outDir);
  }

  await deleteApp(app);
}

async function exportCollection(ref: Query, collection: string, dir: string) {
  info(`Exporting ${collection}.`);

  const count = await ref.count().get();
  const bar = new SingleBar({
    format: "  {bar} {percentage}% | ETA: {eta_formatted} | {value}/{total}",
    barCompleteChar: "\u2588",
    barIncompleteChar: "\u2582",
    etaBuffer: 10000,
    formatTime: (t) => formatDistanceStrict(0, t * 1000),
  });
  bar.start(count.data().count, 0);

  await pipeline(
    ref.stream(),
    async function* (stream) {
      for await (const data of stream) {
        bar.increment();
        const snapshot = data as unknown as QueryDocumentSnapshot;
        yield `${JSON.stringify(snapshot.data())}\n`;
      }
    },
    createWriteStream(path.format({ dir, name: collection, ext: ".jsonl" })),
  );

  bar.stop();
  success(`${capitalize(collection)} export completed.`);
}
