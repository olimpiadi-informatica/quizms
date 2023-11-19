import { Bytes, FirestoreDataConverter, Timestamp } from "firebase/firestore";
import z from "zod";

export const UserSchema = z.object({
  externalId: z.coerce.number().int().positive(),
  name: z.string(),
  token: z.string(),
  role: z.enum(["teacher", "student"]),
});

export type User = z.infer<typeof UserSchema>;

export const userConverter: FirestoreDataConverter<User> = {
  toFirestore(user: User) {
    return user;
  },
  fromFirestore(snapshot) {
    const data = snapshot.data();
    return UserSchema.parse(data);
  },
};

const BinarySchema = z.object({
  data: z
    .custom<Bytes>((value) => value instanceof Bytes)
    .transform((bytes) => bytes.toUint8Array()),
});

export const binaryConverter: FirestoreDataConverter<Uint8Array> = {
  toFirestore(statement: Uint8Array) {
    return {
      data: Bytes.fromUint8Array(statement),
    };
  },
  fromFirestore(snapshot) {
    const data = snapshot.data();
    return BinarySchema.parse(data).data;
  },
};

export type Statement = Uint8Array;
export const statementConverter = binaryConverter;

export type Password = Uint8Array;
export const passwordConverter = binaryConverter;

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

export type Solutions = {
  [key: string]: string | number;
};
