import { contestSchema, studentSchema, venueSchema } from "@olinfo/quizms/models";
import { useCookies } from "react-cookie";
import z from "zod";

import { useRestData } from "./common";

export function useRestStudent() {
  const [{ token }] = useCookies(["token"]);
  return useRestData(
    `contestant/status/${token}`,
    "/api/contestant/status",
    z.preprocess((data: any) => ({ ...data, score: null }), studentSchema),
  );
}

export function useRestVenue() {
  const [{ token }] = useCookies(["token"]);
  return useRestData(`contestant/venue/${token}`, "/api/contestant/venue", venueSchema);
}

export function useRestContest() {
  const [{ token }] = useCookies(["token"]);
  return useRestData(`contestant/contest/${token}`, "/api/contestant/contest", contestSchema);
}
