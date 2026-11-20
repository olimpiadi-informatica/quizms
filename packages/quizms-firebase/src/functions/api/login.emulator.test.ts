import { beforeEach, describe, expect, it } from "vitest";

import { clearFirestore, decodeCustomToken, makeUser, seed } from "~/test-utils/emulator";

import { db } from "../common";
import { adminLogin } from "./admin";
import { teacherLogin } from "./teacher";
import { router } from "./trpc";

const caller = router({ adminLogin, teacherLogin }).createCaller({});

beforeEach(async () => {
  await clearFirestore();
  await seed(db, {
    users: [
      makeUser({ id: "admin", username: "admin", password: "admin-pw", role: "admin" }),
      makeUser({ id: "school", username: "teacher", password: "teacher-pw", role: "teacher" }),
    ],
  });
});

describe("adminLogin", () => {
  it("returns a custom token with the admin role", async () => {
    const token = await caller.adminLogin({ username: "admin", password: "admin-pw" });
    const { uid, claims } = decodeCustomToken(token);
    expect(claims).toEqual({ role: "admin" });
    expect(uid).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("generates a new uid on every login", async () => {
    const token1 = await caller.adminLogin({ username: "admin", password: "admin-pw" });
    const token2 = await caller.adminLogin({ username: "admin", password: "admin-pw" });
    expect(decodeCustomToken(token1).uid).not.toBe(decodeCustomToken(token2).uid);
  });

  it("rejects unknown usernames", async () => {
    await expect(caller.adminLogin({ username: "nobody", password: "admin-pw" })).rejects.toThrow(
      expect.objectContaining({ code: "BAD_REQUEST", message: "Username non esistente" }),
    );
  });

  it("rejects wrong passwords", async () => {
    await expect(caller.adminLogin({ username: "admin", password: "wrong" })).rejects.toThrow(
      expect.objectContaining({ code: "BAD_REQUEST", message: "Password non corretta" }),
    );
  });

  it("rejects teachers", async () => {
    await expect(
      caller.adminLogin({ username: "teacher", password: "teacher-pw" }),
    ).rejects.toThrow(
      expect.objectContaining({ code: "FORBIDDEN", message: "Utenza non abilitata" }),
    );
  });

  it("rejects malformed input", async () => {
    await expect(
      caller.adminLogin({ username: "admin", password: "admin-pw", role: "admin" } as any),
    ).rejects.toThrow(expect.objectContaining({ code: "BAD_REQUEST" }));
  });
});

describe("teacherLogin", () => {
  it("returns a custom token with the teacher role and the school id", async () => {
    const token = await caller.teacherLogin({ username: "teacher", password: "teacher-pw" });
    expect(decodeCustomToken(token).claims).toEqual({ role: "teacher", schoolId: "school" });
  });

  it("rejects unknown usernames", async () => {
    await expect(
      caller.teacherLogin({ username: "school", password: "teacher-pw" }),
    ).rejects.toThrow(
      expect.objectContaining({ code: "BAD_REQUEST", message: "Username non esistente" }),
    );
  });

  it("rejects wrong passwords", async () => {
    await expect(
      caller.teacherLogin({ username: "teacher", password: "admin-pw" }),
    ).rejects.toThrow(
      expect.objectContaining({ code: "BAD_REQUEST", message: "Password non corretta" }),
    );
  });

  it("rejects admins", async () => {
    await expect(caller.teacherLogin({ username: "admin", password: "admin-pw" })).rejects.toThrow(
      expect.objectContaining({ code: "FORBIDDEN", message: "Utenza non abilitata" }),
    );
  });
});
