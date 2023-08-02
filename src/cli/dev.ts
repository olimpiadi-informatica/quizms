import { join } from "node:path";
import { cwd } from "node:process";

import { createServer } from "vite";

import configs from "./configs";

export type DevOptions = {
  dir?: string;
};

export default async function devServer(options?: DevOptions) {
  const root = join(cwd(), options?.dir ?? ".");

  const server = await createServer({
    ...configs,
    root,
    mode: "development",
    server: {
      port: 1234,
    },
  });
  await server.listen();

  server.printUrls();
}
