import { sumBy } from "lodash-es";

import { info, success } from "~/utils/logs";

import { participationConverter } from "./utils/converters-admin";
import { initializeFirebase } from "./utils/initialize";

export default async function definalize() {
  const { db } = await initializeFirebase();

  info("Definalizing all participations.");

  const ref = db
    .collection("participations")
    .where("finalized", "==", false)
    .withConverter(participationConverter)
    .limit(1000);

  let snapshot = await ref.get();

  let sum = 0;
  while (!snapshot.empty) {
    const finalized = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const participation = doc.data();
        if (participation.finalized) {
          await db.doc(doc.ref.path).update({ finalized: false });
          return 1;
        }
        return 0;
      }),
    );

    sum += sumBy(finalized);
    info(`Definalized ${sum} participations.`);

    const last = snapshot.docs.at(-1);
    snapshot = await ref.startAfter(last).get();
  }

  success(`${sum} participations were successfully definalized.`);
}
