import { pbkdf2, randomBytes } from "node:crypto";
import { promisify } from "node:util";

import { fatal, success, warning } from "@olinfo/quizms/utils-node";
import { SingleBar } from "cli-progress";
import { formatDistanceStrict } from "date-fns";
import { getAuth, type UserImportRecord } from "firebase-admin/auth";
import { chunk, partition, truncate } from "lodash-es";
import z from "zod";

type ImportOptions = {
  delete?: true;
  skipExisting?: true;
  force?: true;
};

export async function importUsers(users: User[], customClaims: object, options: ImportOptions) {
  const bar = new SingleBar({
    format: "  {bar} {percentage}% | ETA: {eta_formatted} | {value}/{total}",
    barCompleteChar: "\u2588",
    barIncompleteChar: "\u2582",
    etaBuffer: 10000,
    formatTime: (t) => formatDistanceStrict(0, t * 1000),
  });

  const auth = getAuth();

  if (options.delete) {
    let token: string | undefined;
    for (;;) {
      const { users, pageToken } = await auth.listUsers(1000, token);
      token = pageToken;

      if (users.length === 0) break;
      await auth.deleteUsers(users.map((user) => user.uid));
    }
  }

  const emails = users.map((school) => ({ email: school.email }));
  const usersIds: Record<string, string> = {};

  bar.start(emails.length, 0);
  for (const emailChunk of chunk(emails, 100)) {
    const users = await auth.getUsers(emailChunk);
    for (const user of users.users) {
      usersIds[user.email as string] = user.uid;
    }
    bar.increment(emailChunk.length);
  }
  bar.stop();

  const [existing, nonExisting] = partition(users, (user) => usersIds[user.email]);
  if (existing.length > 0 && !options.skipExisting && !options.force) {
    fatal(
      `${existing.length} users already exist. Use \`--force\` to overwrite or \`--skip-existing\` to ignore.`,
    );
  }

  const usersToImport = options.skipExisting ? nonExisting : [...existing, ...nonExisting];
  const rounds = 100_000;

  bar.start(usersToImport.length, 0);
  const importRecords = await Promise.all(
    usersToImport.map(async (user): Promise<UserImportRecord> => {
      const uid = usersIds[user.email] ?? user.id ?? randomBytes(15).toString("base64");
      const salt = randomBytes(16);
      const hash = await promisify(pbkdf2)(user.password, salt, rounds, 64, "sha256");
      bar.increment();
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
  bar.stop();

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
