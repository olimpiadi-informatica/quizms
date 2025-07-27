import { msg } from "@lingui/core/macro";
import type { _t } from "@lingui/react/macro";
import { getAuth } from "firebase/auth";
import {
  doc,
  type Firestore,
  type FirestoreError,
  getDoc,
  runTransaction,
  setDoc,
} from "firebase/firestore";

import type { Student, StudentRestore } from "~/models";
import { randomId } from "~/utils/random";

import {
  participationMappingConverter,
  studentConverter,
  studentMappingHashConverter,
  studentMappingUidConverter,
  studentRestoreConverter,
  variantMappingConverter,
} from "./common/converters";
import { studentHash } from "./common/hash";

export class DuplicateStudentError extends Error {
  constructor(
    message: string,
    public studentId: string,
    public participationId: string,
  ) {
    super(message);
  }
}

export async function loginAction(db: Firestore, baseStudent: Partial<Student>, t: typeof _t) {
  const auth = getAuth(db.app);

  const student: Student = {
    ...baseStudent,
    id: randomId(),
    uid: auth.currentUser?.uid,
    extraData: {
      userAgent: navigator.userAgent,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      screenWidth: window.screen.availWidth,
      screenHeight: window.screen.availHeight,
      pixelRatio: window.devicePixelRatio,
      darkMode: window.matchMedia("(prefers-color-scheme: dark)").matches,
    },
    createdAt: new Date(),
    absent: false,
    disabled: false,
  };

  try {
    await createStudent(db, student, t);
  } catch (err) {
    if (err instanceof DuplicateStudentError) {
      await createStudentRestore(
        db,
        {
          ...student,
          id: err.studentId,
          participationId: err.participationId,
        },
        t,
      );
    }
    throw err;
  }
}

async function createStudentRestore(db: Firestore, student: Student, t: typeof _t) {
  // In this case the users want to log in as an already existing student
  // If it fails, it means that the token is too old

  try {
    const restore: StudentRestore = {
      id: student.uid!,
      studentId: student.id,
      participationId: student.participationId!,
      token: student.token!,
      name: student.userData!.name as string,
      surname: student.userData!.surname as string,
    };

    await setDoc(
      doc(
        db,
        `participations/${student.participationId}/studentRestore/${student.uid}`,
      ).withConverter(studentRestoreConverter),
      restore,
    );
  } catch {
    throw new Error(t(msg`Code expired`));
  }
}

async function createStudent(db: Firestore, student: Student, t: typeof _t) {
  // to create the student we first need to find
  // - the variant assigned to the student
  // - the school of the student
  // Then, we need to check that there is no other student with the same userData and token already in the db
  student.id = randomId();

  // Get the variant assigned to the student
  // An entry should always exist in variantMapping
  const hash = studentHash(student);
  const variant = `${student.contestId}-${hash.slice(0, 3)}`;

  const variantRef = doc(db, "variantMappings", variant).withConverter(variantMappingConverter);
  const variantMapping = await getDoc(variantRef);
  if (!variantMapping.exists()) {
    throw new Error(t(msg`Variant not found, please contact the platform administrators.`));
  }
  student.variant = variantMapping.data().variant;

  // Check that the token exists and get the participation id (needed to create the student)
  // If the mapping exists, the token can still be too old
  const participationMappingRef = doc(db, "participationMapping", student.token!).withConverter(
    participationMappingConverter,
  );
  const participationMapping = await getDoc(participationMappingRef);
  if (!participationMapping.exists()) {
    throw new Error(t(msg`Invalid code.`));
  }
  const participationMappingData = participationMapping.data();
  if (participationMappingData.contestId !== student.contestId) {
    throw new Error(t(msg`The entered code does not match the selected contest.`));
  }
  student.participationId = participationMappingData.participationId;
  student.startedAt = participationMappingData.startingTime;
  student.finishedAt = participationMappingData.endingTime;

  // Try to create the new student:
  // - check that there is no identical hash already in "studentMappingHash"
  // - create the student
  // - create the mappings to the student (uid -> studentId and hash -> studentId)
  // If we fail creating the student, it means that the token is too old (since it actually exists in participationMapping)

  const base = doc(db, "participations", student.participationId!);

  const studentRef = doc(base, "students", student.id).withConverter(studentConverter);
  const hashMappingRef = doc(base, "studentMappingHash", hash).withConverter(
    studentMappingHashConverter,
  );
  const uidMappingRef = doc(db, "studentMappingUid", student.uid!).withConverter(
    studentMappingUidConverter,
  );
  try {
    await runTransaction(db, async (trans) => {
      const mapping = await trans.get(hashMappingRef);
      if (mapping.exists()) {
        throw new DuplicateStudentError(
          t(msg`Student already registered`),
          mapping.data().studentId,
          student.participationId!,
        );
      }

      trans.set(studentRef, student);
      trans.set(hashMappingRef, { id: hash, studentId: student.id });
      trans.set(uidMappingRef, {
        id: student.uid,
        studentId: student.id,
        participationId: student.participationId,
      });
    });
  } catch (err) {
    if ((err as FirestoreError).code === "permission-denied") {
      throw new Error(t(msg`Code expired.`));
    }
    throw err;
  }

  return student;
}
