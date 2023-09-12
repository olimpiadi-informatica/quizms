import { join } from "node:path";
import { cwd } from "node:process";

import { createServer } from "vite";

import configs from "./vite/configs";

export type DevOptions = {
  dir: string;
  port: number;
};

export default async function devServer(options: DevOptions) {
  process.env.QUIZMS_MODE = "development";

  const server = await createServer({
    ...configs("development"),
    root: join(options.dir, "src"),
  });
  await server.listen(options.port);

  server.printUrls();
}
