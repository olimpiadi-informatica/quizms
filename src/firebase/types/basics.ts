import { Bytes, FirestoreDataConverter } from "firebase/firestore";
import z from "zod";

const StringSchema = z.object({
  data: z.string(),
});

export const stringConverter: FirestoreDataConverter<string> = {
  toFirestore(data: string) {
    return { data };
  },
  fromFirestore(snapshot) {
    const data = snapshot.data();
    return StringSchema.parse(data).data;
  },
};

const BinarySchema = z.object({
  data: z
    .custom<Bytes>((value) => value instanceof Bytes)
    .transform((bytes) => bytes.toUint8Array()),
});

export const binaryConverter: FirestoreDataConverter<Uint8Array> = {
  toFirestore(data: Uint8Array) {
    return {
      data: Bytes.fromUint8Array(data),
    };
  },
  fromFirestore(snapshot) {
    const data = snapshot.data();
    return BinarySchema.parse(data).data;
  },
};
