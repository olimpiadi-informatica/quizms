import { FirestoreDataConverter, Timestamp } from "firebase/firestore";
import z from "zod";

export const MetadataSchema = z.object({
  startingTime: z.instanceof(Timestamp).transform((timestamp) => timestamp.toDate()),
  endingTime: z.instanceof(Timestamp).transform((timestamp) => timestamp.toDate()),
});

export type Metadata = z.infer<typeof MetadataSchema>;

export const metadataConverter: FirestoreDataConverter<Metadata> = {
  toFirestore(metadata: Metadata) {
    return {
      startingTime: Timestamp.fromDate(metadata.startingTime),
      endingTime: Timestamp.fromDate(metadata.endingTime),
    };
  },
  fromFirestore(snapshot) {
    const data = snapshot.data();
    return MetadataSchema.parse(data);
  },
};
