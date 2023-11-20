import { FirestoreDataConverter, Timestamp } from "firebase/firestore";
import z from "zod";

export const SchoolContestSchema = z.object({
  token: z.string(),
  startingTime: z
    .instanceof(Timestamp)
    .optional()
    .transform((ts) => ts?.toDate()),
  teacher: z.string(),
});

export type SchoolContest = z.infer<typeof SchoolContestSchema>;

export const schoolContestConverter: FirestoreDataConverter<SchoolContest> = {
  toFirestore(data: SchoolContest) {
    return {
      ...data,
      startingTime: data.startingTime && Timestamp.fromDate(data.startingTime),
    };
  },
  fromFirestore(snapshot) {
    const data = snapshot.data();
    return SchoolContestSchema.parse(data);
  },
};
