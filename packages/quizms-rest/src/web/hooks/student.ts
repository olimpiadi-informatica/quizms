import {
  contestSchema,
  studentRestoreSchema,
  studentSchema,
  venueSchema,
} from "@olinfo/quizms/models";
import z from "zod";

import { useRestData } from "./common";

export function useRestStudent() {
  return useRestData(
    "contestant/status",
    z.preprocess((data: any) => ({ ...data, score: null }), studentSchema),
  );
}

export function useRestStudentRestore() {
  return useRestData("contestant/restore-status", studentRestoreSchema.nullable());
}

export function useRestVenue() {
  return useRestData("contestant/venue", venueSchema);
}

export function useRestContest() {
  return useRestData("contestant/contest", contestSchema);
}
