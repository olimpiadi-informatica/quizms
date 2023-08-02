import { join } from "node:path";
import { cwd } from "node:process";

import { createServer } from "vite";

import configs from "./configs";

export type DevOptions = {
  dir?: string;
  port: number;
};

export default async function devServer(options: DevOptions) {
  const root = join(cwd(), options?.dir ?? ".");

  const server = await createServer({
    ...configs,
    root,
    mode: "development",
    server: {
      port: options.port,
    },
  });
  await server.listen();

  server.printUrls();
}
