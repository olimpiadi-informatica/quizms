import { noop } from "lodash-es";
import { createServer } from "vite";

import configs from "./vite/configs";

export type DevOptions = {
  port: number;
};

export default async function devServer(options: DevOptions) {
  process.env.QUIZMS_MODE = "development";

  const server = await createServer({
    ...configs("development"),
    publicDir: "public",
  });
  await server.listen(options.port);

  server.printUrls();

  await new Promise(noop);
}
