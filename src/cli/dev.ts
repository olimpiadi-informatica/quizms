import { join } from "node:path";

import { createServer } from "vite";

import configs from "./vite/configs";

export type DevOptions = {
  dir: string;
  port: number;
};

export default async function devServer(options: DevOptions) {
  process.env.QUIZMS_MODE = "development";

  const server = await createServer({
    ...configs(join(options.dir, "src"), "development"),
    publicDir: join(options.dir, "public"),
  });
  await server.listen(options.port);

  server.printUrls();

  await new Promise(() => {});
}
