import {
  announcementSchema,
  contestSchema,
  studentRestoreSchema,
  studentSchema,
  variantSchema,
  venueSchema,
} from "@olinfo/quizms/models";
import z from "zod";

import { useRestData } from "./common";

export function useRestVenues() {
  return useRestData("/api/teacher/venues", venueSchema.array());
}

export function useRestContests() {
  return useRestData("/api/teacher/contests", contestSchema.array());
}

export function useRestStudents(venueId: string) {
  return useRestData(
    `/api/teacher/students/${venueId}`,
    z
      .preprocess(
        (data: any) => ({
          ...data,
          score: null,
        }),
        studentSchema,
      )
      .array(),
  );
}

export function useRestVariants() {
  return useRestData("/api/teacher/variants", variantSchema.array());
}

export function useRestAnnouncements(contestId: string) {
  return useRestData(`/api/teacher/announcements/${contestId}`, announcementSchema.array());
}

export function useRestStudentRestores(venueId: string) {
  return useRestData(`/api/teacher/restores/${venueId}`, studentRestoreSchema.array());
}
