import { sha256 } from "@noble/hashes/sha256";

import type { Student } from "~/models";

export function studentHash(student: Student) {
  const joined = [
    student.userData?.name,
    student.userData?.surname,
    student.userData?.classYear,
    student.userData?.classSection,
    student.token,
  ]
    .join("$")
    .toLowerCase();

  return Array.from(sha256(joined), (b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 24)
    .toUpperCase();
}
