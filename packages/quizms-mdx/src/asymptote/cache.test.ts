import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import withCache from "./cache";

const { fatal, warning } = vi.hoisted(() => ({
  fatal: vi.fn((message: string): never => {
    throw new Error(`fatal: ${message}`);
  }),
  warning: vi.fn(),
}));
vi.mock("@olinfo/quizms/utils-node", () => ({ fatal, warning }));

let dir: string;

beforeEach(async () => {
  vi.clearAllMocks();
  dir = await mkdtemp(path.join(tmpdir(), "quizms-cache-"));
  vi.stubEnv("QUIZMS_CACHE_DIR", dir);
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(dir, { recursive: true, force: true });
});

/** The cache files, by name. */
async function cacheFiles() {
  const [versionDir] = await readdir(dir);
  expect(versionDir).toMatch(/^asy-v\d+\.\d+\.\d+/);
  const files = await readdir(path.join(dir, versionDir));
  return Object.fromEntries(
    await Promise.all(
      files
        .filter((file) => file.endsWith(".json"))
        .map(async (file) => [file, await readFile(path.join(dir, versionDir, file), "utf8")]),
    ),
  );
}

describe("withCache", () => {
  it("computes a value once per key", async () => {
    const fn = vi.fn(async () => ({ src: "data:", width: 1 }));
    expect(await withCache({ file: "a" }, fn)).toEqual({ src: "data:", width: 1 });
    expect(await withCache({ file: "a" }, fn)).toEqual({ src: "data:", width: 1 });
    expect(fn).toHaveBeenCalledOnce();

    await withCache({ file: "b" }, fn);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(Object.values(await cacheFiles())).toEqual([
      '{"src":"data:","width":1}',
      '{"src":"data:","width":1}',
    ]);
  });

  it("serializes concurrent computations of the same key", async () => {
    const fn = vi.fn(async () => "value");
    const results = await Promise.all([withCache("key", fn), withCache("key", fn)]);
    expect(results).toEqual(["value", "value"]);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("does not cache failures", async () => {
    await expect(withCache("key", () => Promise.reject(new Error("asy failed")))).rejects.toThrow(
      "fatal: asy failed",
    );
    expect(Object.values(await cacheFiles())).toEqual([""]);

    expect(await withCache("key", async () => "ok")).toBe("ok");
  });

  it("recomputes corrupted entries", async () => {
    await withCache("key", async () => "old");
    const [file] = Object.keys(await cacheFiles());
    const [versionDir] = await readdir(dir);
    await writeFile(path.join(dir, versionDir, file), "{ not json");

    expect(await withCache("key", async () => "new")).toBe("new");
    expect(warning).toHaveBeenCalledWith("Corrupted cache file");
    expect(await cacheFiles()).toEqual({ [file]: '"new"' });
  });
});
