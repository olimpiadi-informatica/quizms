import { mkdir, open, readFile } from "node:fs/promises";
import { format, join } from "node:path";

import { cert, deleteApp, initializeApp } from "firebase-admin/app";
import { CollectionReference, getFirestore } from "firebase-admin/firestore";

import {
  contestConverter,
  schemaDocConverter,
  schoolConverter,
  schoolMappingConverter,
  solutionConverter,
  studentConverter,
  submissionConverter,
} from "~/firebase/convertersAdmin";

type ExportOptions = {
  schools?: boolean;
  solutions?: boolean;
  students?: boolean;
  submissions?: boolean;
  tokens?: boolean;
  variants?: boolean;
  contests?: boolean;
};

export default async function exportContests(options: ExportOptions) {
  const serviceAccount = JSON.parse(await readFile("serviceAccountKey.json", "utf-8"));
  const app = initializeApp({
    credential: cert(serviceAccount),
  });
  const db = getFirestore(app);

  const timestamp = new Date().toISOString();
  const dir = join("export", timestamp);
  await mkdir(dir, { recursive: true });

  if (options.students) {
    const ref = db.collection("students").withConverter(studentConverter);
    await exportCollection(ref, "students", dir);
  }
  if (options.schools) {
    const ref = db.collection("schools").withConverter(schoolConverter);
    await exportCollection(ref, "schools", dir);
  }
  if (options.solutions) {
    const ref = db.collection("solutions").withConverter(solutionConverter);
    await exportCollection(ref, "solutions", dir);
  }
  if (options.submissions) {
    const ref = db.collection("submissions").withConverter(submissionConverter);
    await exportCollection(ref, "submissions", dir);
  }
  if (options.tokens) {
    const ref = db.collection("schoolMapping").withConverter(schoolMappingConverter);
    await exportCollection(ref, "tokens", dir);
  }
  if (options.variants) {
    const ref = db.collection("schema").withConverter(schemaDocConverter);
    await exportCollection(ref, "variants", dir);
  }
  if (options.contests) {
    const ref = db.collection("contests").withConverter(contestConverter);
    await exportCollection(ref, "contests", dir);
  }

  await deleteApp(app);
}

async function exportCollection(ref: CollectionReference, collection: string, dir: string) {
  const chunkSize = 25_000;
  let snapshot = await ref.limit(chunkSize).get();

  const file = await open(format({ dir, name: collection, ext: ".jsonl" }), "w");
  let sum = 0;

  while (!snapshot.empty) {
    for (const doc of snapshot.docs) {
      await file.write(JSON.stringify(doc.data()) + "\n");
    }

    sum += snapshot.size;
    console.log(`Found ${sum} ${collection}.`);

    const last = snapshot.docs.at(-1);
    snapshot = await ref.startAfter(last).limit(chunkSize).get();
  }
}
