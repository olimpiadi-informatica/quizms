import child_process from "node:child_process";
import fs, { readFile } from "node:fs/promises";
import { cpus, platform } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { isPlainObject, stubFalse, stubTrue } from "lodash-es";
import type { PluginContext } from "rollup";
import { temporaryFile, temporaryWrite } from "tempy";
import type { PluginOption, TransformResult } from "vite";

import { AsyncPool } from "~/utils/async-pool";

import { executePython } from "./python";

export default function asymptote(): PluginOption {
  return {
    name: "quizms:asymptote",
    async transform(_code, id) {
      const [pathname, query] = id.split("?");
      if (path.extname(pathname) !== ".asy") return;

      const params = new URLSearchParams(query);
      if (params.has("v")) {
        return transformAsymptoteVariants(pathname, params);
      }

      await findAsymptoteDependencies(this, pathname);

      const inject = params.get("inject");

      const image = await transformAsymptote(pathname, inject);
      return {
        code: image,
        map: { mappings: "" },
      };
    },
  };
}

async function transformAsymptoteVariants(
  fileName: string,
  params: URLSearchParams,
): Promise<TransformResult> {
  const variantFile = path.join(path.dirname(fileName), params.get("v")!);
  const variants = await executePython(variantFile);

  if (!Array.isArray(variants) || !isPlainObject(variants[0])) {
    throw new TypeError("Variant file must export an array of objects");
  }

  params.delete("v");

  const imports = variants
    .map((v, i) => {
      const inject = Object.entries(v)
        .map(([key, val]) => jsToAsy(key, val))
        .join("\n");

      params.set("inject", inject);

      return `import img_${i} from "${fileName}?${params}";`;
    })
    .join("\n");

  const code = `${imports}
import "${variantFile}";

const variants = [${variants.map((_, i) => `img_${i}`).join(", ")}];

export default function img(variant) {
  return variants[variant];
}`;

  return {
    code,
    map: { mappings: "" },
  };
}

const pool = new AsyncPool(cpus().length);
const execFile = promisify(child_process.execFile);

async function transformAsymptote(fileName: string, inject: string | null): Promise<string> {
  const svgFile = temporaryFile({ extension: "svg" });

  // ????????? https://github.com/vitejs/vite/pull/2614
  let decodedInject = inject;
  while (decodedInject?.includes("%")) {
    decodedInject = decodeURIComponent(decodedInject);
  }

  const injectFile = await temporaryWrite(decodedInject ?? "", { extension: "asy" });

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
    throw new Error(`Failed to compile asymptote:\n${err.stderr}`);
  }

  return readFile(svgFile, { encoding: "utf8" });
}

async function findAsymptoteDependencies(ctx: PluginContext, asyPath: string) {
  const deps = new Set<string>();
  const newDeps: string[] = [asyPath];

  while (newDeps.length > 0) {
    const file = newDeps.pop()!;
    if (deps.has(file)) continue;
    deps.add(file);
    ctx.addWatchFile(file);

    if (file !== asyPath) ctx.addWatchFile(file);

    const content = await fs.readFile(file, { encoding: "utf8" });

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
}

function jsToAsy(name: string, val: any): string {
  if (
    typeof val === "number" ||
    typeof val === "boolean" ||
    typeof val === "string" ||
    Array.isArray(val)
  ) {
    return `${getAsyTypeName(val)} ${name} = ${getAsyValue(val)};`;
  }

  throw new TypeError("Unknown type");
}

function getAsyTypeName(val: any): string {
  if (typeof val === "number") {
    return Number.isInteger(val) ? "int" : "real";
  }
  if (typeof val === "boolean") {
    return "bool";
  }
  if (typeof val === "string") {
    return "string";
  }
  if (Array.isArray(val)) {
    return `${getAsyTypeName(val[0])}[]`;
  }

  throw new TypeError("Unknown type");
}

function getAsyValue(val: any): string {
  if (Array.isArray(val)) {
    return `{ ${val.map((v) => getAsyValue(v)).join(", ")} }`;
  }

  return JSON.stringify(val);
}
