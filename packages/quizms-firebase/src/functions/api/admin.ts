import crypto from "node:crypto";

import * as logger from "firebase-functions/logger";
import z from "zod";

import { auth } from "../common";
import { apiError } from "./errors";
import { getUser } from "./queries";
import { publicProcedure } from "./trpc";

export const adminLogin = publicProcedure
  .input(
    z.strictObject({
      username: z.string(),
      password: z.string(),
    }),
  )
  .mutation(async (opts) => {
    const { input: data } = opts;
    logger.info("Admin login request received", { data });

    const user = await getUser(data.username);
    if (!user) {
      throw apiError("BAD_REQUEST", "unknownUsername");
    }

    if (user.password !== data.password) {
      throw apiError("BAD_REQUEST", "wrongPassword");
    }
    if (user.role !== "admin") {
      throw apiError("FORBIDDEN", "userDisabled");
    }
    return auth.createCustomToken(crypto.randomUUID(), { role: "admin" });
  });
