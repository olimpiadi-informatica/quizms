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
    "/api/contestant/status",
    z.preprocess((data: any) => ({ ...data, score: null }), studentSchema),
  );
}

export function useRestStudentRestore() {
  return useRestData("/api/contestant/restore-status", studentRestoreSchema);
}

export function useRestVenue() {
  return useRestData("/api/contestant/venue", venueSchema);
}

export function useRestContest() {
  return useRestData("/api/contestant/contest", contestSchema);
}
