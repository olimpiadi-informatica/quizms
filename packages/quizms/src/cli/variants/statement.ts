import { writeFile } from "node:fs/promises";
import path from "node:path";
import { cwd } from "node:process";
import { pathToFileURL } from "node:url";

import type { OutputAsset, RollupOutput } from "rollup";
import { createBuilder, type InlineConfig, mergeConfig } from "vite";

import configs from "~/cli/vite/configs";
import { externalLibs } from "~/cli/vite/statement-externals";
import type { VariantsConfig } from "~/models";
import { fatal, success } from "~/utils-node";

import { loaderFile, serverStatementFile } from "./files";

type Manifest = Record<
  string,
  {
    id: string;
    chunks: string[];
    name: string;
    async?: boolean;
  }
>;

export type BaseStatement = {
  clientModule: {
    id: string;
    file: string;
  };
  cssModule?: string;
};

export async function buildBaseStatements(
  generationConfigs: VariantsConfig[],
  outDir: string,
): Promise<BaseStatement> {
  const entry = Object.fromEntries(generationConfigs.map((c) => [c.id, c.entry]));

  const bundleConfig = mergeConfig(configs("production"), {
    build: {
      copyPublicDir: false,
      outDir,
      emptyOutDir: true,
      lib: {
        entry,
        fileName: "base-statement-[name]",
        formats: ["es"],
      },
      rollupOptions: {
        output: {
          assetFileNames: "chunks/[name][extname]",
          chunkFileNames: "chunks/[name].js",
          hoistTransitiveImports: false,
          manualChunks: (id, meta) => {
            const info = meta.getModuleInfo(id);
            const directives: string[] | undefined = info?.meta?.preserveDirectives?.directives;
            const isClient = directives?.includes("use client");
            if (isClient) {
              return "client-modules";
            }
            if (info?.isIncluded) {
              return path
                .relative(cwd(), id.replace("\0", ""))
                .replace(/^(\.*\/)*/, "")
                .replace(/\.\w+$/, "");
            }
          },
          onlyExplicitManualChunks: true,
        },
        external: [...externalLibs, "sharp", "svgo"],
      },
    },
    environments: {
      rsc: {
        resolve: {
          conditions: ["react-server"],
          noExternal: true,
        },
      },
    },
  } as InlineConfig);

  const builder = await createBuilder(bundleConfig);
  const environment = builder.environments.rsc;

  let outputs: RollupOutput[];
  try {
    outputs = (await builder.build(environment)) as RollupOutput[];
  } catch (err) {
    fatal(`Build failed: ${err}`);
  }

  const chunks = outputs
    .flatMap((output) => output.output)
    .filter((chunk) => chunk.type === "chunk")
    .filter((chunk) => chunk.code.startsWith('"use client"'));

  if (chunks.length === 0) {
    fatal("No client chunks found");
  } else if (chunks.length !== 1) {
    fatal("Multiple client chunks found");
  }
  const clientChunk = chunks[0];

  const manifest: Manifest = {};
  const clientChunkFile = path.join(outDir, clientChunk.fileName);
  const clientModuleId = `${crypto.randomUUID()}.mjs`;
  manifest[pathToFileURL(clientChunkFile).href] = {
    id: clientModuleId,
    chunks: [],
    name: "*",
    async: true,
  };

  const cssChunks = outputs
    .flatMap((output) => output.output)
    .filter((chunk) => chunk.type === "asset")
    .filter((chunk) => chunk.fileName.endsWith(".css"));
  if (cssChunks.length > 1) {
    fatal("Multiple CSS chunks found");
  }
  const cssChunk: OutputAsset | undefined = cssChunks[0];

  await Promise.all([
    writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest)),
    writeFile(path.join(outDir, "loader.js"), loaderFile()),
    writeFile(path.join(outDir, "package.json"), '{"type":"module"}'),
    writeFile(path.join(outDir, "server.js"), serverStatementFile()),
  ]);

  success("Build succeeded");

  return {
    clientModule: {
      id: clientModuleId,
      file: clientChunkFile,
    },
    cssModule: cssChunk && path.join(outDir, cssChunk.fileName),
  };
}
