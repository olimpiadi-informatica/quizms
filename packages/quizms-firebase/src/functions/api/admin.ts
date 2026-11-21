import crypto from "node:crypto";

import { type Announcement, announcementSchema, contestSchema } from "@olinfo/quizms/models";
import { randomId } from "@olinfo/quizms/utils";
import { TRPCError } from "@trpc/server";
import { FieldValue } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import z from "zod";

import { announcementConverter } from "~/cli/utils/converters-admin";

import { auth, db } from "../common";
import { getContest, getUser, getVenue } from "./queries";
import { docId } from "./schemas";
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

export const adminUpdateContestSettings = publicProcedure
  .input(
    z.strictObject({
      contestId: docId,
      settings: z.strictObject({
        scoreVisibility: contestSchema.shape.scoreVisibility,
        instructions: contestSchema.shape.instructions.nullish(),
      }),
    }),
  )
  .mutation(async (opts) => {
    const { input: data, ctx } = opts;
    logger.info("Admin update contest settings received", { data });

    if (ctx.claims?.role !== "admin") {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Non autorizzato" });
    }

    const contest = await getContest(data.contestId);
    if (!contest) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Gara non trovata" });
    }

    const updateData: Record<string, any> = {
      scoreVisibility: data.settings.scoreVisibility,
    };
    if (data.settings.instructions !== undefined) {
      updateData.instructions = data.settings.instructions ?? FieldValue.delete();
    }

    await db.doc(`contests/${data.contestId}`).update(updateData);
  });

export const adminSetVenueFinalized = publicProcedure
  .input(
    z.strictObject({
      venueId: docId,
      finalized: z.boolean(),
    }),
  )
  .mutation(async (opts) => {
    const { input: data, ctx } = opts;
    logger.info("Admin set venue finalized received", { data });

    if (ctx.claims?.role !== "admin") {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Non autorizzato" });
    }

    const venue = await getVenue(data.venueId);
    if (!venue) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Sede non trovata" });
    }

    await db.doc(`venues/${data.venueId}`).update({ finalized: data.finalized });
  });

export const adminCreateAnnouncement = publicProcedure
  .input(
    z.strictObject({
      contestId: docId,
      level: announcementSchema.shape.level,
      title: z.string(),
      body: z.string(),
    }),
  )
  .mutation(async (opts) => {
    const { input: data, ctx } = opts;
    logger.info("Admin create announcement received", { data });

    if (ctx.claims?.role !== "admin") {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Non autorizzato" });
    }

    const contest = await getContest(data.contestId);
    if (!contest) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Gara non trovata" });
    }

    const id = randomId();
    const announcement: Announcement = {
      id,
      createdAt: new Date(),
      contestIds: [data.contestId],
      level: data.level,
      title: data.title,
      body: data.body,
    };

    await db.doc(`announcements/${id}`).withConverter(announcementConverter).set(announcement);

    return { id };
  });
