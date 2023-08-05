import { join } from "node:path";
import { cwd } from "node:process";

import { createServer } from "vite";

import configs from "./vite/configs";

export type DevOptions = {
  dir?: string;
  port: number;
};

export default async function devServer(options: DevOptions) {
  const server = await createServer({
    ...configs("development"),
    root: options.dir,
  });
  await server.listen(options.port);

  server.printUrls();
}
