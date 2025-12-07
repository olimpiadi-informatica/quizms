import { mkdir, open } from "node:fs/promises";
import path from "node:path";

import { fatal, warning } from "@olinfo/quizms/utils-node";
import { version } from "package.json";
import { lock } from "proper-lockfile";

async function withCache<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const cacheDir = path.join(process.env.QUIZMS_CACHE_DIR || ".quizms/cache", `asy-v${version}`);
  const cacheFile = path.join(cacheDir, `${key}.json`);

  await mkdir(cacheDir, { recursive: true });
  const fh = await open(cacheFile, "a+");

  let unlock: () => Promise<void>;
  try {
    unlock = await lock(cacheFile, {
      retries: {
        factor: 1,
        retries: 60,
        minTimeout: 1000,
      },
    });
  } catch {
    await fh.close();
    fatal("Asymptote compilation timed out");
  }

  try {
    const cachedResult = await fh.readFile("utf8");
    if (cachedResult) {
      const parsedResult = JSON.parse(cachedResult);
      await fh.close();
      await unlock();
      return parsedResult;
    }
  } catch {
    await fh.truncate(0);
    warning("Corrupted cache file");
  }

  try {
    const result = await fn();
    await fh.writeFile(JSON.stringify(result));
    return result;
  } catch (err: any) {
    await fh.truncate(0);
    fatal(err.message);
  } finally {
    await fh.close();
    await unlock();
  }
}

export default withCache;
