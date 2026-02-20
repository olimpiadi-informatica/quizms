import { writeFile } from "node:fs/promises";
import path from "node:path";

import { createBuilder, type InlineConfig, mergeConfig } from "vite";

import { serverSchemaFile } from "~/cli/variants/files";
import configs from "~/cli/vite/configs";
import type { VariantsConfig } from "~/models";
import { fatal, success } from "~/utils-node";

export async function buildBaseSchemas(generationConfigs: VariantsConfig[], outDir: string) {
  const entry = Object.fromEntries(generationConfigs.map((c) => [c.id, c.entry]));

  const bundleConfig = mergeConfig(configs("production"), {
    build: {
      copyPublicDir: false,
      outDir,
      emptyOutDir: true,
      lib: {
        entry,
        fileName: "base-schema-[name]",
        formats: ["es"],
      },
    },
    environments: {
      schema: {
        resolve: {
          conditions: ["schema", "react-server"],
        },
      },
    },
  } as InlineConfig);

  const builder = await createBuilder(bundleConfig);
  const environment = builder.environments.schema;

  try {
    await builder.build(environment);
  } catch (err) {
    fatal(`Build failed: ${err}`);
  }

  await Promise.all([
    writeFile(path.join(outDir, "package.json"), '{"type":"module"}'),
    writeFile(path.join(outDir, "server.js"), serverSchemaFile()),
  ]);

  success("Build succeeded");
}
