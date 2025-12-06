import crypto from "node:crypto";

import * as logger from "firebase-functions/logger";

import { auth, type Endpoint } from "~/functions/common";

import { getUser } from "./queries";
import type { AdminLogin } from "./schema";

export const adminLogin: Endpoint<AdminLogin> = async (_request, data) => {
  logger.info("Admin login request received", { data });

  const user = await getUser(data.username);
  if (!user) {
    return { success: false, errorCode: "USER_NOT_FOUND", error: "Username non esistente" };
  }

  if (user.role !== "admin") {
    return { success: false, errorCode: "INVALID_ROLE", error: "Utenza non abilitata" };
  }
  if (user.password !== data.password) {
    return { success: false, errorCode: "INVALID_PASSWORD", error: "Password non corretta" };
  }
  const token = await auth.createCustomToken(crypto.randomUUID(), { role: "admin" });
  return { success: true, data: { token } };
};
