import {
  announcementSchema,
  contestSchema,
  studentSchema,
  variantSchema,
  venueSchema,
} from "@olinfo/quizms/models";
import { useCookies } from "react-cookie";
import z from "zod";

import { useRestData } from "./common";

export function useRestVenues() {
  const [{ username }] = useCookies(["username", "password"]);
  return useRestData(`/teacher/venues/${username}`, "/api/teacher/venues", venueSchema.array());
}

export function useRestContests() {
  const [{ username }] = useCookies(["username", "password"]);
  return useRestData(
    `/teacher/contests/${username}`,
    "/api/teacher/contests",
    contestSchema.array(),
  );
}

export function useRestStudents(venueId: string) {
  return useRestData(
    `/venue/students/${venueId}`,
    `/api/teacher/students/${venueId}`,
    z.preprocess((data: any) => ({ ...data, score: null }), studentSchema).array(),
  );
}

export function useRestVariants() {
  return useRestData("/variants", "/api/teacher/variants", variantSchema.array());
}

export function useRestAnnouncements(contestId: string) {
  return useRestData(
    `/announcements/${contestId}`,
    `/api/teacher/announcements/${contestId}`,
    announcementSchema.array(),
  );
}
