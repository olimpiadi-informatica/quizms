import { pbkdf2, randomBytes } from "node:crypto";
import { promisify } from "node:util";

import { type UserImportRecord, getAuth } from "firebase-admin/auth";
import { partition, truncate } from "lodash-es";
import z from "zod";

import { fatal, success, warning } from "~/utils/logs";

type ImportOptions = {
  skipExisting?: true;
  force?: true;
};

export async function importUsers(users: User[], customClaims: object, options: ImportOptions) {
  const auth = getAuth();

  const userRecords = Object.fromEntries(
    await Promise.all(
      users.map(async (user) => {
        const record = await auth.getUserByEmail(user.email).catch(() => undefined);
        return [user.email, record?.uid] as const;
      }),
    ),
  );

  const [existing, nonExisting] = partition(users, (user) => userRecords[user.email]);
  if (existing.length > 0 && !options.skipExisting && !options.force) {
    fatal(
      `${existing.length} users already exist. Use \`--force\` to overwrite or \`--skip-existing\` to ignore.`,
    );
  }

  const usersToImport = options.skipExisting ? nonExisting : [...existing, ...nonExisting];

  const rounds = 100_000;
  const importRecords = await Promise.all(
    usersToImport.map(async (user): Promise<UserImportRecord> => {
      const uid = userRecords[user.email] ?? user.id ?? randomBytes(15).toString("base64");
      const salt = randomBytes(16);
      const hash = await promisify(pbkdf2)(user.password, salt, rounds, 64, "sha256");
      return {
        uid,
        email: user.email,
        emailVerified: true,
        passwordHash: hash,
        passwordSalt: salt,
        displayName: user.name,
        disabled: false,
        customClaims,
      };
    }),
  );

  if (importRecords.length === 0) {
    warning("No users to import. Skipping...");
    return;
  }

  const { failureCount, successCount, errors } = await auth.importUsers(importRecords, {
    hash: { algorithm: "PBKDF2_SHA256", rounds },
  });

  if (successCount > 0) {
    success(`${successCount} users imported!`);
  }
  if (failureCount > 0) {
    fatal(
      `Failed to import ${failureCount} users: ${truncate(errors.map((err) => err.error.message).join(", "))}`,
    );
  }
}

export const userSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  email: z.string().email(),
  password: z.string(),
});

export type User = z.infer<typeof userSchema>;
