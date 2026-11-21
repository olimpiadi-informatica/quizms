import { FieldValue } from "firebase-admin/firestore";
import type { Request } from "firebase-functions/tasks";
import { beforeEach, describe, expect, it } from "vitest";

import { studentConverter } from "~/cli/utils/converters-admin";
import { clearFirestore, makeStudent, makeVariant, seed } from "~/test-utils/emulator";

import { db } from "./common";
import { updateScoresHandler } from "./update-scores";

const correct = {
  "1": { type: "openNumber", value: 42 },
  "2": { type: "multipleChoice", value: "B" },
} as const;
const wrong = {
  "1": { type: "openNumber", value: 1 },
  "2": { type: "multipleChoice", value: "A" },
} as const;

async function getScores() {
  const snapshot = await db
    .collection("venues/venue/students")
    .withConverter(studentConverter)
    .get();
  return Object.fromEntries(snapshot.docs.map((doc) => [doc.id, doc.data().score]));
}

function runHandler(token: string) {
  return updateScoresHandler({ data: { venueId: "venue", token } } as Request);
}

beforeEach(async () => {
  await clearFirestore();
  await seed(db, {
    variants: [
      makeVariant({ id: "v1" }),
      // Same problems, different points.
      makeVariant({
        id: "v2",
        schema: {
          "1": {
            type: "openNumber",
            correct: [42],
            pointsCorrect: 10,
            pointsBlank: 0,
            pointsWrong: 0,
            originalId: "1",
          },
        },
      }),
    ],
  });
});

describe("updateScoresHandler", () => {
  it("computes the score of the students with the given token", async () => {
    await seed(db, {
      students: [
        makeStudent({ id: "correct", token: "token", answers: correct }),
        makeStudent({ id: "wrong", token: "token", answers: wrong }),
        makeStudent({ id: "blank", token: "token", answers: {} }),
        makeStudent({ id: "v2", token: "token", variantId: "v2", answers: correct }),
        makeStudent({ id: "stale", token: "token", answers: correct, score: 0 }),
        makeStudent({ id: "other-token", token: "other", answers: correct }),
      ],
    });

    await runHandler("token");

    expect(await getScores()).toEqual({
      correct: 8,
      wrong: -1,
      blank: 1,
      v2: 10,
      stale: 8,
      "other-token": undefined,
    });
  });

  it("skips students without a variant", async () => {
    await seed(db, { students: [makeStudent({ id: "no-variant", token: "token" })] });
    await db.doc("venues/venue/students/no-variant").update({ variantId: FieldValue.delete() });
    await runHandler("token");
    expect(await getScores()).toEqual({ "no-variant": undefined });
  });

  it("does nothing if there are no students", async () => {
    await runHandler("token");
    expect(await getScores()).toEqual({});
  });

  it("leaves the score unset if the variant does not exist", async () => {
    await seed(db, {
      students: [makeStudent({ id: "s1", token: "token", variantId: "missing", answers: correct })],
    });
    await runHandler("token");
    expect(await getScores()).toEqual({ s1: undefined });
  });

  it("removes the score of students marked as absent", async () => {
    await seed(db, {
      students: [
        makeStudent({ id: "absent", token: "token", absent: true, answers: correct, score: 8 }),
      ],
    });
    await runHandler("token");
    expect(await getScores()).toEqual({ absent: undefined });
  });
});
