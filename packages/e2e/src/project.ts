// Helpers to run the QuizMS CLI on a temporary copy of the fixture contest.
import { type ChildProcess, execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, mkdtemp, realpath, rm, symlink } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const e2eDir = path.resolve(fileURLToPath(import.meta.url), "..", "..");
const fixtureDir = path.join(e2eDir, "fixture");
/** Temporary projects live inside the repository so that Vite allows serving the workspace. */
const tmpRoot = path.join(e2eDir, ".tmp");

/** QuizMS packages enabled in the fixture (`@olinfo/quizms-*` dependencies are CLI plugins). */
const quizmsPackages = ["quizms", "quizms-mdx", "quizms-training"];

/**
 * Packages a contest project depends on directly (see the `quizms-demo` project): imported by
 * the compiled statements and by the generated entries, so they must resolve from the project.
 */
const projectDependencies = [
  "@olinfo/react-components",
  "clsx",
  "lodash-es",
  "react",
  "react-dom",
  "react-server-dom-webpack",
  "sharp",
  "svgo",
  "vite",
  "wouter",
];

export type Project = {
  dir: string;
  /** Runs `quizms <args>` in the project, resolving with its output. Rejects on failure. */
  quizms: (args: string[], timeout?: number) => Promise<string>;
  /** Starts `quizms <args>` in the background (e.g. `dev`). */
  spawnQuizms: (args: string[]) => ChildProcess;
  remove: () => Promise<void>;
};

function packageDir(name: string): Promise<string> {
  return realpath(path.join(e2eDir, "node_modules", "@olinfo", name));
}

/** Finds a dependency of the QuizMS packages, as installed by pnpm in the workspace. */
export async function findDependency(name: string) {
  for (const pkg of quizmsPackages) {
    const candidate = path.join(await packageDir(pkg), "node_modules", name);
    if (existsSync(candidate)) return realpath(candidate);
  }
  throw new Error(`Cannot find ${name} among the dependencies of the QuizMS packages`);
}

/**
 * Copies the fixture to a new temporary directory and gives it a `node_modules` folder linking
 * to the workspace packages, like a real project that installed QuizMS.
 */
export async function createProject(name: string): Promise<Project> {
  await mkdir(tmpRoot, { recursive: true });
  const dir = await mkdtemp(path.join(tmpRoot, `${name}-`));
  await cp(fixtureDir, dir, { recursive: true });

  const nodeModules = path.join(dir, "node_modules");
  await mkdir(path.join(nodeModules, "@olinfo"), { recursive: true });
  for (const pkg of quizmsPackages) {
    await symlink(await packageDir(pkg), path.join(nodeModules, "@olinfo", pkg), "dir");
  }
  for (const dep of projectDependencies) {
    await symlink(await findDependency(dep), path.join(nodeModules, dep), "dir");
  }

  // The bin has a `node --experimental-import-meta-resolve` shebang: run it directly.
  const bin = path.join(nodeModules, "@olinfo", "quizms", "bin", "bin.js");
  const env = { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" };

  return {
    dir,
    async quizms(args, timeout = 240_000) {
      try {
        const { stdout, stderr } = await promisify(execFile)(bin, args, {
          cwd: dir,
          env,
          timeout,
          maxBuffer: 64 * 1024 * 1024,
        });
        return stdout + stderr;
      } catch (err) {
        const { stdout, stderr } = err as { stdout?: string; stderr?: string };
        throw new Error(`quizms ${args.join(" ")} failed:\n${stdout ?? ""}\n${stderr ?? ""}`, {
          cause: err,
        });
      }
    },
    spawnQuizms(args) {
      // In its own process group, so that the whole tree can be killed.
      return spawn(bin, args, { cwd: dir, env, detached: true, stdio: "pipe" });
    },
    async remove() {
      await rm(dir, { recursive: true, force: true });
    },
  };
}

/** Kills a process started with `spawnQuizms` and all its children. */
export async function killProcessTree(child: ChildProcess | undefined) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    return;
  }
  const timeout = setTimeout(() => {
    try {
      process.kill(-child.pid!, "SIGKILL");
    } catch {}
  }, 5_000);
  await exited;
  clearTimeout(timeout);
}

export function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as { port: number };
      server.close(() => resolve(port));
    });
  });
}
