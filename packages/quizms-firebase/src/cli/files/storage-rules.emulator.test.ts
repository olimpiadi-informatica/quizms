import { readFileSync } from "node:fs";
import path from "node:path";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { addMinutes, subMinutes } from "date-fns";
import { doc, type Firestore, setDoc } from "firebase/firestore";
import { type FirebaseStorage, getMetadata, ref, uploadString } from "firebase/storage";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

import { PROJECT_ID } from "~/test-utils/emulator";

let env: RulesTestEnvironment;

// Security rules use the emulator clock (`request.time`), which cannot be faked.
const now = new Date();

const STATEMENT = "statements/contest/v1/statement.js";

// The contexts return compat instances, the modular API accepts them too.
const storage = (context: RulesTestContext) => context.storage() as unknown as FirebaseStorage;
const firestore = (context: RulesTestContext) => context.firestore() as unknown as Firestore;

const asStudent = (uid = "student-uid") =>
  storage(env.authenticatedContext(uid, { role: "student", venueId: "venue", studentId: "s1" }));

async function seedStudent(data: object = {}) {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(firestore(context), "venues/venue/students/s1"), {
      uid: "student-uid",
      contestId: "contest",
      variantId: "v1",
      participationWindow: { start: subMinutes(now, 10), end: addMinutes(now, 60) },
      ...data,
    });
  });
}

beforeAll(async () => {
  const rulesDir = import.meta.dirname;
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync(path.join(rulesDir, "firestore.rules"), "utf8") },
    storage: { rules: readFileSync(path.join(rulesDir, "storage.rules"), "utf8") },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
  await env.withSecurityRulesDisabled(async (context) => {
    for (const file of [STATEMENT, "statements/contest/v2/statement.js", "other/file.txt"]) {
      await uploadString(ref(storage(context), file), "content");
    }
  });
});

describe("statements", () => {
  it("are readable by students of the variant after the start of the window", async () => {
    await seedStudent();
    await assertSucceeds(getMetadata(ref(asStudent(), STATEMENT)));
  });

  it("are not readable before the start of the window", async () => {
    await seedStudent({
      participationWindow: { start: addMinutes(now, 10), end: addMinutes(now, 60) },
    });
    await assertFails(getMetadata(ref(asStudent(), STATEMENT)));
  });

  it("are not readable by students of other variants or contests", async () => {
    await seedStudent();
    await assertFails(getMetadata(ref(asStudent(), "statements/contest/v2/statement.js")));
    await seedStudent({ contestId: "other-contest" });
    await assertFails(getMetadata(ref(asStudent(), STATEMENT)));
  });

  it("are not readable with the claims of another student", async () => {
    await seedStudent();
    await assertFails(getMetadata(ref(asStudent("other-uid"), STATEMENT)));
  });

  it("are not readable if the student does not exist", async () => {
    await assertFails(getMetadata(ref(asStudent(), STATEMENT)));
  });

  it("are readable by teachers", async () => {
    const teacher = storage(env.authenticatedContext("t", { role: "teacher", schoolId: "s" }));
    await assertSucceeds(getMetadata(ref(teacher, STATEMENT)));
  });

  it("are not readable by unauthenticated users", async () => {
    await assertFails(getMetadata(ref(storage(env.unauthenticatedContext()), STATEMENT)));
  });

  it("are not writable", async () => {
    await seedStudent();
    const teacher = storage(env.authenticatedContext("t", { role: "teacher", schoolId: "s" }));
    await assertFails(uploadString(ref(teacher, STATEMENT), "hacked"));
    await assertFails(uploadString(ref(asStudent(), STATEMENT), "hacked"));
  });
});

describe("other files", () => {
  it("are not accessible", async () => {
    const teacher = storage(env.authenticatedContext("t", { role: "teacher", schoolId: "s" }));
    await assertFails(getMetadata(ref(teacher, "other/file.txt")));
    await assertFails(getMetadata(ref(storage(env.unauthenticatedContext()), "other/file.txt")));
  });
});
