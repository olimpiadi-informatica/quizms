import { FirestoreDataConverter } from "firebase/firestore";
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
