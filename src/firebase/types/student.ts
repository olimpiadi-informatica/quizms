import { FirestoreDataConverter, Timestamp } from "firebase/firestore";
import z from "zod";

export const StudentSchema = z.object({
  name: z.string(),
  surname: z.string(),
  classYear: z.number(),
  classSection: z.string(),
  birthDate: z.instanceof(Timestamp).transform((ts) => ts.toDate()),

  school: z.string(),
  contest: z.string(),
  token: z.string(),

  variant: z.string(),
});

export type Student = z.infer<typeof StudentSchema>;

export const studentConverter: FirestoreDataConverter<Student> = {
  toFirestore(data: Student) {
    return {
      ...data,
      birthDate: Timestamp.fromDate(data.birthDate),
    };
  },
  fromFirestore(snapshot) {
    const data = snapshot.data();
    return StudentSchema.parse(data);
  },
};
