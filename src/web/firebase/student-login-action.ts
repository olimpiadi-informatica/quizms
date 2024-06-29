import { getAuth } from "firebase/auth";
import { Firestore, FirestoreError, doc, getDoc, runTransaction, setDoc } from "firebase/firestore";

import { Student, StudentRestore, studentHash } from "~/models";
import { randomId } from "~/utils/random";

import {
  participationMappingConverter,
  studentConverter,
  studentMappingHashConverter,
  studentMappingUidConverter,
  studentRestoreConverter,
  variantMappingConverter,
} from "./common/converters";

export class DuplicateStudentError extends Error {
  constructor(
    public studentId: string,
    public participationId: string,
  ) {
    super("Studente già registrato");
  }
}

export async function loginAction(db: Firestore, baseStudent: Partial<Student>) {
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
    await createStudent(db, student);
  } catch (err) {
    if (err instanceof DuplicateStudentError) {
      await createStudentRestore(db, {
        ...student,
        id: err.studentId,
        participationId: err.participationId,
      });
    }
    throw err;
  }
}

async function createStudentRestore(db: Firestore, student: Student) {
  // In this case the users want to log in as an already existing student
  // If it fails, it means that the token is too old

  try {
    const restore: StudentRestore = {
      id: student.uid!,
      studentId: student.id,
      participationId: student.participationId!,
      token: student.token!,
      name: student.personalInformation!.name as string,
      surname: student.personalInformation!.surname as string,
    };

    await setDoc(
      doc(
        db,
        `participations/${student.participationId}/studentRestore/${student.uid}`,
      ).withConverter(studentRestoreConverter),
      restore,
    );
  } catch {
    throw new Error("Codice scaduto");
  }
}

async function createStudent(db: Firestore, student: Student) {
  // to create the student we first need to find
  // - the variant assigned to the student
  // - the school of the student
  // Then, we need to check that there is no other student with the same personalInformation and token already in the db
  student.id = randomId();

  // Get the variant assigned to the student
  // An entry should always exist in variantMapping
  const hash = studentHash(student);
  const variant = `${student.contestId}-${hash.slice(0, 3)}`;

  const variantRef = doc(db, "variantMappings", variant).withConverter(variantMappingConverter);
  const variantMapping = await getDoc(variantRef);
  if (!variantMapping.exists()) {
    throw new Error("Variante non trovata, contattare gli amministratori della piattaforma.");
  }
  student.variant = variantMapping.data().variant;

  // Check that the token exists and get the participation id (needed to create the student)
  // If the mapping exists, the token can still be too old
  const participationMappingRef = doc(db, "participationMapping", student.token!).withConverter(
    participationMappingConverter,
  );
  const participationMapping = await getDoc(participationMappingRef);
  if (!participationMapping.exists()) {
    throw new Error("Codice non valido.");
  }
  const participationMappingData = participationMapping.data();
  if (participationMappingData.contestId !== student.contestId) {
    throw new Error("Il codice inserito non corrisponde alla gara selezionata.");
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
        throw new DuplicateStudentError(mapping.data().studentId, student.participationId!);
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
      throw new Error("Codice scaduto.");
    }
    throw err;
  }

  return student;
}
