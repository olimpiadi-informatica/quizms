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
    await deleteCollection(db, collection);
  }

  await confirm(
    `You are about to import the ${pc.bold(collection)}. ${
      options.force ? "This will overwrite any existing data. " : ""
    }Are you sure?`,
  );

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

async function deleteCollection(db: Firestore, collection: string) {
  await confirm(`You are about to delete all ${pc.bold(collection)}. Are you sure?`);

  const collectionRef = db.collection(collection);
  const query = collectionRef.limit(400);

  for (;;) {
    const snapshot = await query.get();
    if (snapshot.empty) break;

    const batch = db.batch();
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();
  }

  info(`${upperFirst(collection)} deleted!`);
}
