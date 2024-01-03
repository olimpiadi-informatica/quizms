import { Firestore, FirestoreDataConverter, GrpcStatus } from "firebase-admin/firestore";
import { upperFirst } from "lodash-es";
import pc from "picocolors";

import { confirm, fatal, info, success } from "~/cli/utils/logs";

type ImportOptions = {
  delete?: true;
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
    await confirm(
      `You are about to delete all ${pc.bold(
        collection,
      )}. Any previous data will be lost, this operation cannot be undone. Are you really sure?`,
    );
    const ref = db.collection(collection);
    await db.recursiveDelete(ref);
    info(`${upperFirst(collection)} deleted!`);
  }

  if (options?.force) {
    await confirm(
      `You are about to import the ${pc.bold(
        collection,
      )}. This will overwrite any existing data, the previous data will be lost. Are you really sure?`,
    );
  }

  for (let i = 0; i < data.length; i += 400) {
    const batch = db.batch();
    for (const record of data.slice(i, i + 400)) {
      const ref = db.doc(`${collection}/${record.id}`).withConverter(converter);
      if (options?.force) {
        batch.set(ref, record);
      } else {
        batch.create(ref, record);
      }
    }
    try {
      await batch.commit();
    } catch (e: any) {
      if (e.code === GrpcStatus.ALREADY_EXISTS) {
        fatal(
          `Document already exists in \`${collection}\`. Use \`--force\` to overwrite existing documents.`,
        );
      } else {
        fatal(`Cannot import ${collection}: ${e}`);
      }
    }
  }

  success(`${upperFirst(collection)} imported!`);
}
