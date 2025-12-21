import crypto from "node:crypto";

import { TRPCError } from "@trpc/server";
import * as logger from "firebase-functions/logger";
import z from "zod";

import { auth } from "../common";
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
      throw new TRPCError({ code: "BAD_REQUEST", message: "Username non esistente" });
    }

    if (user.password !== data.password) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Password non corretta" });
    }
    if (user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Utenza non abilitata" });
    }
    return auth.createCustomToken(crypto.randomUUID(), { role: "admin" });
  });
