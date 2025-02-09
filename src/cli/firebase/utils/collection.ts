import { confirm } from "@inquirer/prompts";
import type { Firestore, FirestoreDataConverter } from "firebase-admin/firestore";
import { partition, upperFirst } from "lodash-es";
import pc from "picocolors";

import { fatal, info, success } from "~/utils/logs";

type ImportOptions = {
  delete?: true;
  skipExisting?: true;
  force?: true;
};

export async function importCollection<T extends { id: string }>(
  db: Firestore,
  collection: string,
  data: T[],
  converter: FirestoreDataConverter<T>,
  options: ImportOptions,
) {
  if (options.delete) {
    const confirmed = await confirm({
      message: `You are about to delete all ${pc.bold(
        collection,
      )}. Any previous data will be lost, this operation cannot be undone. Are you really sure?`,
      default: false,
    });
    if (!confirmed) {
      fatal("Command aborted.");
    }

    const ref = db.collection(collection);
    await db.recursiveDelete(ref);
    info(`${upperFirst(collection)} deleted!`);
  }

  const existingIds = new Set<string>();
  for (const doc of await db.collection(collection).listDocuments()) {
    existingIds.add(doc.id);
  }
  const [existing, nonExisting] = partition(data, (doc) => existingIds.has(doc.id));
  if (existing.length > 0 && !options.skipExisting && !options.force) {
    fatal(
      `Documents already exist in \`${collection}\`. Use \`--force\` to overwrite or \`--skip-existing\` to ignore.`,
    );
  }

  const docsToImport = options.skipExisting ? nonExisting : [...existing, ...nonExisting];

  if (options.force && existing.length > 0) {
    const confirmed = await confirm({
      message: `You are about to import the ${pc.bold(
        collection,
      )}. ${existing.length} document will be overwritten, the previous data will be lost. Are you really sure?`,
      default: false,
    });
    if (!confirmed) {
      fatal("Command aborted.");
    }
  }

  for (let i = 0; i < docsToImport.length; i += 400) {
    const batch = db.batch();
    for (const record of docsToImport.slice(i, i + 400)) {
      const ref = db.doc(`${collection}/${record.id}`).withConverter(converter);
      if (options.force) {
        batch.set(ref, record);
      } else {
        batch.create(ref, record);
      }
    }
    try {
      await batch.commit();
    } catch (err) {
      fatal(`Cannot import ${collection}: ${err}`);
    }
  }

  success(`${docsToImport.length} ${collection} imported!`);
}
