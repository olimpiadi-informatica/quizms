import { styleText } from "node:util";

import { confirm } from "@inquirer/prompts";
import { fatal } from "@olinfo/quizms/utils-node";
import type { Firestore } from "firebase-admin/firestore";
import { info } from "firebase-functions/logger";
import { upperFirst } from "lodash-es";

import type { User } from "~/models/user";

import { importCollection } from "./collection";
import { userConverter } from "./converters-admin";

type ImportOptions = {
  delete?: true;
  deleteIds?: string[];
  filterContest?: string;
  skipExisting?: true;
  force?: true;
};

export async function importUsers(
  db: Firestore,
  role: string,
  users: Omit<User, "id" | "role">[],
  options: ImportOptions,
) {
  if (options.delete) {
    if (options.deleteIds) {
      const confirmed = await confirm({
        message: `You are about to delete ${options.deleteIds.length} selected ${styleText(
          "bold",
          role,
        )} users. Any previous data will be lost, this operation cannot be undone. Are you really sure?`,
        default: false,
      });
      if (!confirmed) {
        fatal("Command aborted.");
      }
      for (const id of options.deleteIds) {
        await db.recursiveDelete(db.doc(`users/${id}`));
      }
      info(`${options.deleteIds.length} ${upperFirst(role)} users deleted!`);
    } else {
      const confirmed = await confirm({
        message: `You are about to delete all ${styleText(
          "bold",
          role,
        )} users. Any previous data will be lost, this operation cannot be undone. Are you really sure?`,
        default: false,
      });
      if (!confirmed) {
        fatal("Command aborted.");
      }

      const ref = db.collection("users");
      await db.recursiveDelete(ref);
      info(`${upperFirst(role)} users deleted!`);
    }
  }

  await importCollection(
    db,
    "users",
    users.map((u) => ({ ...u, id: u.username, role })),
    userConverter,
    { ...options, delete: undefined },
  );
}
