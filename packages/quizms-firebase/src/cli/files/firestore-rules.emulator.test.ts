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
import {
  collection,
  deleteDoc,
  doc,
  type Firestore,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

import { PROJECT_ID } from "~/test-utils/emulator";

let env: RulesTestEnvironment;

// Security rules use the emulator clock (`request.time`), which cannot be faked: the participation
// windows are relative to the current time, with margins of several minutes.
const now = new Date();
const runningWindow = { start: subMinutes(now, 30), end: addMinutes(now, 30) };

const venue = {
  schoolId: "school",
  contestId: "contest",
  name: "Venue",
  token: "token",
  participationWindow: runningWindow,
};

const student = {
  uid: "student-uid",
  userData: { name: "Mario", surname: "Rossi" },
  venueId: "venue",
  contestId: "contest",
  token: "token",
  participationWindow: runningWindow,
  variantId: "v1",
  answers: {},
  extraData: {},
  createdAt: subMinutes(now, 10),
  updatedAt: subMinutes(now, 10),
};

const STUDENT_PATH = "venues/venue/students/s1";

// The contexts return compat instances, the modular API accepts them too.
function db(context: RulesTestContext) {
  return context.firestore() as unknown as Firestore;
}

const unauthenticated = () => db(env.unauthenticatedContext());
const asStudent = (uid = "student-uid", claims: object = {}) =>
  db(
    env.authenticatedContext(uid, {
      role: "student",
      venueId: "venue",
      studentId: "s1",
      ...claims,
    }),
  );
const asTeacher = (schoolId = "school") =>
  db(env.authenticatedContext(`teacher-${schoolId}`, { role: "teacher", schoolId }));
const asAdmin = () => db(env.authenticatedContext("admin", { role: "admin" }));

async function seed(docs: Record<string, object>) {
  await env.withSecurityRulesDisabled(async (context) => {
    for (const [docPath, data] of Object.entries(docs)) {
      await setDoc(doc(db(context), docPath), data);
    }
  });
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(path.join(import.meta.dirname, "firestore.rules"), "utf8"),
    },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await seed({
    "contests/contest": { name: "Contest" },
    "websites/website": { origin: "https://example.com" },
    "announcements/a1": { title: "Announcement" },
    "variants/v1": { contestId: "contest", schema: {} },
    "users/school": { username: "school", password: "secret", role: "teacher" },
    "submissions/sub1": { studentId: "s1" },
    "venues/venue": venue,
    "venues/other-venue": { ...venue, schoolId: "other-school", token: "other-token" },
    [STUDENT_PATH]: student,
    "venues/venue/students/s2": { ...student, uid: "other-uid" },
    "studentRestores/restore-uid": { studentId: "s1", venueId: "venue", status: "pending" },
  });
});

describe("contests and websites", () => {
  it("are readable by everyone", async () => {
    await assertSucceeds(getDoc(doc(unauthenticated(), "contests/contest")));
    await assertSucceeds(getDocs(collection(unauthenticated(), "contests")));
    await assertSucceeds(getDoc(doc(unauthenticated(), "websites/website")));
    await assertSucceeds(getDocs(collection(asStudent(), "websites")));
  });

  it("are not writable by teachers and students", async () => {
    for (const firestore of [unauthenticated(), asStudent(), asTeacher()]) {
      await assertFails(setDoc(doc(firestore, "contests/contest"), { name: "Hacked" }));
      await assertFails(setDoc(doc(firestore, "contests/new"), { name: "New" }));
      await assertFails(deleteDoc(doc(firestore, "websites/website")));
    }
  });
});

describe("announcements and variants", () => {
  it("are readable by teachers", async () => {
    await assertSucceeds(getDocs(collection(asTeacher(), "announcements")));
    await assertSucceeds(getDoc(doc(asTeacher(), "variants/v1")));
    await assertSucceeds(getDocs(collection(asTeacher("other-school"), "variants")));
  });

  it("are not readable by students and unauthenticated users", async () => {
    for (const firestore of [unauthenticated(), asStudent()]) {
      await assertFails(getDoc(doc(firestore, "announcements/a1")));
      await assertFails(getDoc(doc(firestore, "variants/v1")));
      await assertFails(getDocs(collection(firestore, "variants")));
    }
  });

  it("are not writable by teachers", async () => {
    await assertFails(setDoc(doc(asTeacher(), "announcements/a2"), { title: "New" }));
    await assertFails(updateDoc(doc(asTeacher(), "variants/v1"), { schema: { x: 1 } }));
  });
});

describe("venues", () => {
  it("are readable by the teacher of the school", async () => {
    await assertSucceeds(getDoc(doc(asTeacher(), "venues/venue")));
  });

  it("are readable by the students of the venue", async () => {
    await assertSucceeds(getDoc(doc(asStudent(), "venues/venue")));
  });

  it("are not readable by others", async () => {
    await assertFails(getDoc(doc(asTeacher("other-school"), "venues/venue")));
    await assertFails(getDoc(doc(asTeacher(), "venues/other-venue")));
    await assertFails(getDoc(doc(asStudent(), "venues/other-venue")));
    await assertFails(getDoc(doc(unauthenticated(), "venues/venue")));
  });

  it("can only be listed filtering by school", async () => {
    await assertSucceeds(
      getDocs(query(collection(asTeacher(), "venues"), where("schoolId", "==", "school"))),
    );
    await assertFails(getDocs(collection(asTeacher(), "venues")));
    await assertFails(
      getDocs(query(collection(asTeacher(), "venues"), where("schoolId", "==", "other-school"))),
    );
  });

  it("are not writable by teachers and students", async () => {
    await assertFails(updateDoc(doc(asTeacher(), "venues/venue"), { finalized: true }));
    await assertFails(updateDoc(doc(asTeacher(), "venues/venue"), { token: "new" }));
    await assertFails(updateDoc(doc(asStudent(), "venues/venue"), { token: "new" }));
    await assertFails(setDoc(doc(asTeacher(), "venues/new"), { ...venue }));
    await assertFails(deleteDoc(doc(asTeacher(), "venues/venue")));
  });
});

describe("students", () => {
  describe("read", () => {
    it("is allowed to the student itself", async () => {
      await assertSucceeds(getDoc(doc(asStudent(), STUDENT_PATH)));
    });

    it("is allowed to the teacher of the venue", async () => {
      await assertSucceeds(getDoc(doc(asTeacher(), STUDENT_PATH)));
      await assertSucceeds(getDocs(collection(asTeacher(), "venues/venue/students")));
    });

    it("is denied to other students, other teachers and unauthenticated users", async () => {
      await assertFails(getDoc(doc(asStudent("other-uid"), STUDENT_PATH)));
      await assertFails(getDocs(collection(asStudent(), "venues/venue/students")));
      await assertFails(getDoc(doc(asTeacher("other-school"), STUDENT_PATH)));
      await assertFails(getDocs(collection(asTeacher("other-school"), "venues/venue/students")));
      await assertFails(getDoc(doc(unauthenticated(), STUDENT_PATH)));
    });
  });

  describe("create", () => {
    it("is denied to all clients", async () => {
      await assertFails(setDoc(doc(asTeacher(), "venues/venue/students/new"), student));
      await assertFails(
        setDoc(doc(asTeacher("other-school"), "venues/venue/students/new"), student),
      );
      await assertFails(setDoc(doc(asStudent(), "venues/venue/students/new"), student));
      await assertFails(setDoc(doc(asAdmin(), "venues/venue/students/new"), student));
      await assertFails(setDoc(doc(unauthenticated(), "venues/venue/students/new"), student));
    });
  });

  describe("update by the student", () => {
    const answers = { "1": { type: "openNumber", value: 42 } };

    it("is denied to students", async () => {
      await assertFails(
        updateDoc(doc(asStudent(), STUDENT_PATH), {
          answers,
          extraData: { tab: 1 },
          updatedAt: serverTimestamp(),
        }),
      );
      await assertFails(
        updateDoc(doc(asStudent(), STUDENT_PATH), {
          participationWindow: runningWindow,
          updatedAt: serverTimestamp(),
        }),
      );
    });

    it.each([
      ["score", 100],
      ["userData", { name: "Luigi", surname: "Rossi" }],
      ["variantId", "v2"],
      ["absent", true],
      ["disabled", true],
      ["uid", "other"],
      ["createdAt", new Date()],
    ])("denies updating `%s`", async (key, value) => {
      await assertFails(
        updateDoc(doc(asStudent(), STUDENT_PATH), { [key]: value, updatedAt: serverTimestamp() }),
      );
    });
  });

  describe("update by the teacher", () => {
    it("is denied to teachers", async () => {
      await assertFails(
        updateDoc(doc(asTeacher(), STUDENT_PATH), {
          userData: { name: "Luigi", surname: "Rossi" },
          absent: true,
          answers: { "1": { type: "openNumber", value: 1 } },
          updatedAt: serverTimestamp(),
        }),
      );
      await assertFails(
        updateDoc(doc(asTeacher(), STUDENT_PATH), { disabled: true, updatedAt: serverTimestamp() }),
      );
    });

    it("denies teachers of other schools", async () => {
      await assertFails(
        updateDoc(doc(asTeacher("other-school"), STUDENT_PATH), {
          absent: true,
          updatedAt: serverTimestamp(),
        }),
      );
    });
  });

  describe("delete", () => {
    it("is denied to all clients", async () => {
      await assertFails(deleteDoc(doc(asTeacher(), STUDENT_PATH)));
      await assertFails(deleteDoc(doc(asTeacher("other-school"), STUDENT_PATH)));
      await assertFails(deleteDoc(doc(asStudent(), STUDENT_PATH)));
      await assertFails(deleteDoc(doc(asAdmin(), STUDENT_PATH)));
      await assertFails(deleteDoc(doc(unauthenticated(), STUDENT_PATH)));
    });
  });
});

describe("studentRestores", () => {
  const RESTORE_PATH = "studentRestores/restore-uid";

  it("are readable by the requesting user", async () => {
    await assertSucceeds(getDoc(doc(asStudent("restore-uid"), RESTORE_PATH)));
    await assertFails(getDoc(doc(asStudent(), RESTORE_PATH)));
  });

  it("are readable by the teacher of the venue", async () => {
    await assertSucceeds(getDoc(doc(asTeacher(), RESTORE_PATH)));
  });

  it("cannot be updated or deleted by teachers or other clients", async () => {
    await assertFails(updateDoc(doc(asTeacher(), RESTORE_PATH), { status: "approved" }));
    await assertFails(deleteDoc(doc(asTeacher(), RESTORE_PATH)));
    await assertFails(
      updateDoc(doc(asTeacher("other-school"), RESTORE_PATH), { status: "approved" }),
    );
    await assertFails(deleteDoc(doc(asTeacher("other-school"), RESTORE_PATH)));
  });

  it("cannot be created or approved by clients", async () => {
    await assertFails(
      setDoc(doc(asStudent("new-uid"), "studentRestores/new-uid"), {
        studentId: "s1",
        venueId: "venue",
        status: "approved",
      }),
    );
    await assertFails(
      setDoc(doc(asTeacher(), "studentRestores/new-uid"), { venueId: "venue", status: "pending" }),
    );
    await assertFails(
      updateDoc(doc(asStudent("restore-uid"), RESTORE_PATH), { status: "approved" }),
    );
    await assertFails(getDoc(doc(unauthenticated(), RESTORE_PATH)));
  });
});

describe("other collections", () => {
  it("are not accessible by teachers, students and unauthenticated users", async () => {
    for (const firestore of [unauthenticated(), asStudent(), asTeacher()]) {
      await assertFails(getDoc(doc(firestore, "users/school")));
      await assertFails(getDocs(collection(firestore, "users")));
      await assertFails(getDoc(doc(firestore, "submissions/sub1")));
      await assertFails(setDoc(doc(firestore, "submissions/sub2"), { studentId: "s1" }));
      await assertFails(setDoc(doc(firestore, "unknown/doc"), { value: 1 }));
    }
  });

  it("are readable by admins, but not directly writable", async () => {
    const admin = asAdmin();
    await assertSucceeds(getDocs(collection(admin, "users")));
    await assertSucceeds(getDoc(doc(admin, "submissions/sub1")));
    await assertSucceeds(getDocs(collection(admin, "variants")));
    await assertFails(updateDoc(doc(admin, "venues/venue"), { finalized: true }));
    await assertFails(updateDoc(doc(admin, STUDENT_PATH), { score: 10 }));
    await assertFails(setDoc(doc(admin, "contests/new"), { name: "New" }));
    await assertFails(deleteDoc(doc(admin, "studentRestores/restore-uid")));
  });
});
