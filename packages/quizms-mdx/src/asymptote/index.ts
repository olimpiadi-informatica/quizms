import child_process from "node:child_process";
import { createHash } from "node:crypto";
import fs, { readFile } from "node:fs/promises";
import { cpus, platform } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { AsyncPool, validate } from "@olinfo/quizms/utils";
import sizeOf from "image-size";
import { stubFalse, stubTrue } from "lodash-es";
import type { PluginContext } from "rollup";
import { temporaryFile, temporaryWrite } from "tempy";
import { z } from "zod";

const pool = new AsyncPool(cpus().length);
const execFile = promisify(child_process.execFile);

export async function transformAsymptote(fileName: string, inject: object | null) {
  const svgFile = temporaryFile({ extension: "svg" });

  const injectString = createAsymptoteInject(inject);
  const injectFile = await temporaryWrite(injectString ?? "", { extension: "asy" });

  try {
    if (platform() === "darwin") {
      const pdfFile = temporaryFile({ extension: "pdf" });
      await pool.run(
        execFile,
        "asy",
        [fileName, "-f", "pdf", "-autoimport", injectFile, "-o", pdfFile.replace(/\.pdf$/, "")],
        { cwd: path.dirname(fileName) },
      );

      await pool.run(execFile, "pdf2svg", [pdfFile, svgFile], {});
      await fs.unlink(pdfFile);
    } else {
      await pool.run(
        execFile,
        "asy",
        [
          fileName,
          "-f",
          "svg",
          "-tex",
          "pdflatex",
          "-autoimport",
          injectFile,
          "-o",
          svgFile.replace(/\.svg/, ""),
        ],
        { cwd: path.dirname(fileName) },
      );
    }
  } catch (err: any) {
    console.error(err);
    throw new Error(`Failed to compile asymptote:\n${err.stderr ?? err.message}`);
  }

  const svg = await readFile(svgFile);
  const size = sizeOf(svg);
  return {
    src: `data:image/svg+xml;base64,${svg.toString("base64")}`,
    width: size.width,
    height: size.height,
  };
}

export async function findAsymptoteDependencies(ctx: PluginContext, asyPath: string) {
  const hash = createHash("sha256");

  const deps = new Set<string>();
  const newDeps: string[] = [asyPath];

  while (newDeps.length > 0) {
    const file = newDeps.pop()!;
    if (deps.has(file)) continue;
    deps.add(file);
    ctx.addWatchFile(file);

    if (file !== asyPath) ctx.addWatchFile(file);

    const content = await fs.readFile(file, { encoding: "utf8" });
    hash.update(content);

    const matches = content.matchAll(
      /^(?:access|from|import|include)\s+(?:"([^\n"]+)"|([^\s"]+);)/gm,
    );
    for (const match of matches) {
      const matchPath = match[1] ?? match[2];
      const matchFile = path.format({
        dir: path.join(path.dirname(file), path.dirname(matchPath)),
        name: path.basename(matchPath, ".asy"),
        ext: ".asy",
      });

      const exists = await fs.access(matchFile).then(stubTrue, stubFalse);
      if (exists) newDeps.push(matchFile);
    }
  }

  return hash.digest().toString("hex");
}

type VariantVariable = number | boolean | string | VariantVariable[];

const variantVariabileSchema: z.ZodType<VariantVariable> = z.union([
  z.number().finite(),
  z.boolean(),
  z.string(),
  z.lazy(() => variantVariabileSchema.array().nonempty()),
]);

function createAsymptoteInject(variables: object | null) {
  if (variables === null) return null;
  const injectVariables = validate(variantSchema, variables);
  return Object.entries(injectVariables).map(jsToAsy).join("\n");
}

const variantSchema = z.record(variantVariabileSchema);

function jsToAsy([name, val]: [string, VariantVariable]): string {
  return `${getAsyTypeName(val)} ${name} = ${getAsyValue(val)};`;
}

function getAsyTypeName(val: VariantVariable): string {
  if (typeof val === "number") {
    return Number.isInteger(val) ? "int" : "real";
  }
  if (typeof val === "boolean") {
    return "bool";
  }
  if (typeof val === "string") {
    return "string";
  }
  return `${getAsyTypeName(val[0])}[]`;
}

function getAsyValue(val: VariantVariable): string {
  if (Array.isArray(val)) {
    return `{ ${val.map((v) => getAsyValue(v)).join(", ")} }`;
  }

  return JSON.stringify(val);
}
