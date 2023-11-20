import { FirestoreDataConverter, Timestamp } from "firebase/firestore";
import z from "zod";

import { Student, StudentSchema } from "~/firebase/types/student";

export const ContestSchema = z.object({
  name: z.string(),
  questionCount: z.coerce.number(),
  startingWindowStart: z
    .instanceof(Timestamp)
    .optional()
    .transform((ts) => ts?.toDate()),
  startingWindowEnd: z
    .instanceof(Timestamp)
    .optional()
    .transform((ts) => ts?.toDate()),
  duration: z.number().optional(),
  allowStudents: z.boolean().optional(),
  allowRestart: z.boolean().optional(),
});

export type Contest = z.infer<typeof ContestSchema>;

export const contestConverter: FirestoreDataConverter<Contest> = {
  toFirestore(data: Contest) {
    return {
      ...data,
      startingWindowStart: data.startingWindowStart && Timestamp.fromDate(data.startingWindowStart),
      startingWindowEnd: data.startingWindowEnd && Timestamp.fromDate(data.startingWindowEnd),
    };
  },
  fromFirestore(snapshot) {
    const data = snapshot.data();
    return ContestSchema.parse(data);
  },
};
