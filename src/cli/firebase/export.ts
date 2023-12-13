import { readFile, writeFile } from "node:fs/promises";

import { cert, deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { range } from "lodash-es";
import PapaParse from "papaparse";

import { studentConverter } from "~/firebase/convertersAdmin";
import { Student } from "~/models/student";

export default async function exportStudents() {
  const serviceAccount = JSON.parse(await readFile("serviceAccountKey.json", "utf-8"));
  const app = initializeApp({
    credential: cert(serviceAccount),
  });
  const db = getFirestore(app);

  const snapshot = await db.collection("students").withConverter(studentConverter).get();

  const students = snapshot.docs.map((doc) => doc.data());

  const data = students
    .filter((student) => !student.disabled && student.school !== "TEST00000X" && !isEmpty(student))
    .map((student) => [
      student.school,
      student.contest,
      student.personalInformation?.classYear,
      (student.personalInformation?.classSection as string)?.trim(),
      (student.personalInformation?.surname as string)?.trim(),
      (student.personalInformation?.name as string)?.trim(),
      (student.personalInformation?.birthDate as Date)?.toLocaleDateString(),
      student.variant,
      ...range(16).map((i) => student.answers?.[i]),
      student.createdAt?.toLocaleString(),
      student.updatedAt?.toLocaleString(),
      student.id,
    ]);
  const schools = new Set(students.map((student) => student.school));

  console.info(`${data.length} students found from ${schools.size} different schools.`);

  const fields = [
    "school",
    "contest",
    "classYear",
    "classSection",
    "surname",
    "name",
    "birthDate",
    "variant",
    ...range(16).map((i) => `q${i + 1}`),
    "createdAt",
    "updatedAt",
    "id",
  ];

  data.sort();

  await writeFile("students.csv", PapaParse.unparse({ fields, data }));

  await deleteApp(app);
}

function isEmpty(student: Student) {
  return Object.values(student.personalInformation ?? {}).every((field) => !field);
}
