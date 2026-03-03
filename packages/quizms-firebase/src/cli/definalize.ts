import { info, success } from "@olinfo/quizms/utils-node";
import { sumBy } from "lodash-es";

import { venueConverter } from "./utils/converters-admin";
import { initializeFirebase } from "./utils/initialize";

export default async function definalize() {
  const { db } = await initializeFirebase();

  info("Definalizing all venues.");

  const ref = db
    .collection("venues")
    .where("finalized", "==", false)
    .withConverter(venueConverter)
    .limit(1000);

  let snapshot = await ref.get();

  let sum = 0;
  while (!snapshot.empty) {
    const finalized = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const venue = doc.data();
        if (venue.finalized) {
          await db.doc(doc.ref.path).update({ finalized: false });
          return 1;
        }
        return 0;
      }),
    );

    sum += sumBy(finalized);
    info(`Definalized ${sum} venues.`);

    const last = snapshot.docs.at(-1);
    snapshot = await ref.startAfter(last).get();
  }

  success(`${sum} venues were successfully definalized.`);
}
