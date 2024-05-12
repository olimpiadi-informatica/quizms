import path from "node:path";

import { noop } from "lodash-es";
import { createServer } from "vite";

import configs from "./vite/configs";

export type DevOptions = {
  dir: string;
  port: number;
};

export default async function devServer(options: DevOptions) {
  process.env.QUIZMS_MODE = "development";

  const server = await createServer({
    ...configs(path.join(options.dir, "src"), "development"),
    publicDir: path.join(options.dir, "public"),
  });
  await server.listen(options.port);

  server.printUrls();

  await new Promise(noop);
}
