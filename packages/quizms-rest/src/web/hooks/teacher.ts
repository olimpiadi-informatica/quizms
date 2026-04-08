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
  return useRestData("teacher/venues", venueSchema.array());
}

export function useRestContests() {
  return useRestData("teacher/contests", contestSchema.array());
}

export function useRestStudents(venueId: string) {
  return useRestData(
    `teacher/students/${venueId}`,
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
  return useRestData("teacher/variants", variantSchema.array());
}

export function useRestAnnouncements(contestId: string) {
  return useRestData(`teacher/announcements/${contestId}`, announcementSchema.array());
}

export function useRestStudentRestores(venueId: string) {
  return useRestData(`teacher/restores/${venueId}`, studentRestoreSchema.array());
}
