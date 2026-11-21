import type { OutputBundle, OutputChunk } from "rollup";
import type { PluginOption } from "vite";

/**
 * Renames the exports of the client chunk of the statements that start with `$`.
 *
 * Statements reference client components by export name, and React Server Components decode
 * strings starting with `$` as special values (an export named `$` becomes the element marker),
 * so such a component would not be found. Minified export names can start with `$`.
 */
export default function clientExportNames(): PluginOption {
  return {
    name: "quizms:client-export-names",
    enforce: "post",
    generateBundle(_, bundle) {
      for (const chunk of chunks(bundle)) {
        if (!chunk.code.startsWith('"use client"')) continue;
        const renames = safeNames(chunk.exports);
        if (renames.size === 0) continue;

        chunk.code = renameExports(chunk.code, renames);
        chunk.exports = chunk.exports.map((name) => renames.get(name) ?? name);

        for (const other of chunks(bundle)) {
          if (other !== chunk && other.imports.includes(chunk.fileName)) {
            other.code = renameImports(other.code, chunk.fileName, renames);
          }
        }
      }
    },
  };
}

function chunks(bundle: OutputBundle) {
  return Object.values(bundle).filter((file): file is OutputChunk => file.type === "chunk");
}

function safeNames(exports: string[]) {
  const taken = new Set(exports);
  const renames = new Map<string, string>();
  for (const name of exports) {
    if (!name.startsWith("$")) continue;
    let safe = `_${name}`;
    while (taken.has(safe)) safe = `_${safe}`;
    taken.add(safe);
    renames.set(name, safe);
  }
  return renames;
}

const specifierRegex = /^\s*([\w$]+)(?:\s+as\s+([\w$]+))?\s*$/;

/** Rewrites the `export { local as exported, ... }` statement at the end of the chunk. */
function renameExports(code: string, renames: Map<string, string>) {
  const statements = [...code.matchAll(/export\s*\{([^}]*)\}/g)];
  const last = statements.at(-1);
  if (!last || last.index === undefined) return code;
  const specifiers = last[1].split(",").map((specifier) => {
    const match = specifierRegex.exec(specifier);
    if (!match) return specifier;
    const [, local, exported = local] = match;
    const renamed = renames.get(exported);
    return renamed ? `${local} as ${renamed}` : specifier;
  });
  const statement = `export{${specifiers.join(",")}}`;
  return code.slice(0, last.index) + statement + code.slice(last.index + last[0].length);
}

/** Rewrites `import { exported as local, ... } from "<file>"` statements of `fileName`. */
function renameImports(code: string, fileName: string, renames: Map<string, string>) {
  const base = fileName
    .split("/")
    .pop()!
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*(["'][^"']*${base}["'])`, "g");
  return code.replace(regex, (_statement, list: string, source: string) => {
    const specifiers = list.split(",").map((specifier) => {
      const match = specifierRegex.exec(specifier);
      if (!match) return specifier;
      const [, imported, local = imported] = match;
      const renamed = renames.get(imported);
      return renamed ? `${renamed} as ${local}` : specifier;
    });
    return `import{${specifiers.join(",")}}from${source}`;
  });
}
