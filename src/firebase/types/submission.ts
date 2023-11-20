import { FirestoreDataConverter, Timestamp, serverTimestamp } from "firebase/firestore";
import z from "zod";

export const SubmissionSchema = z.object({
  uid: z.string(),
  answers: z.record(z.union([z.number(), z.string()])),
  timestamp: z.instanceof(Timestamp).transform((ts) => ts?.toDate()),
});

export type Submission = z.infer<typeof SubmissionSchema>;

export const submissionConverter: FirestoreDataConverter<Submission> = {
  toFirestore(data: Submission) {
    return {
      ...data,
      timestamp: serverTimestamp(),
    };
  },
  fromFirestore(snapshot) {
    const data = snapshot.data();
    return SubmissionSchema.parse(data);
  },
};
