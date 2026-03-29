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
    "/api/contestant/status",
    z.preprocess((data: any) => ({ ...data, score: null }), studentSchema),
  );
}

export function useRestStudentRestore() {
  return useRestData("contestant/restore", "/api/contestant/restore-status", studentRestoreSchema);
}

export function useRestVenue() {
  return useRestData("contestant/venue", "/api/contestant/venue", venueSchema);
}

export function useRestContest() {
  return useRestData("contestant/contest", "/api/contestant/contest", contestSchema);
}
