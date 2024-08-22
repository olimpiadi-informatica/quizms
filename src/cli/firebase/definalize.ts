import { info, success } from "~/utils/logs";

import { participationConverter } from "./utils/converters-admin";
import { initializeFirebase } from "./utils/initialize";

export default async function definalize(options: { dir: string }) {
  const { db } = await initializeFirebase(options.dir);

  info("Definalizing all participations.");

  const ref = db.collection("participations").withConverter(participationConverter);

  const chunkSize = 25_000;
  let snapshot = await ref.limit(chunkSize).get();

  let sum = 0;
  while (!snapshot.empty) {
    await Promise.all(
      snapshot.docs.map(async (doc) => {
        const participation = doc.data();
        if (participation.finalized) {
          await ref.doc(doc.id).update({ finalized: false });
        }
      }),
    );

    sum += snapshot.size;
    info(`Definalized ${sum} participations.`);

    const last = snapshot.docs.at(-1);
    snapshot = await ref.startAfter(last).limit(chunkSize).get();
  }

  success("All participations are definalized.");
}
