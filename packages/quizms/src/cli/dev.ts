import path from "node:path";
import { cwd } from "node:process";

import { noop } from "lodash-es";
import { createServer } from "vite";

import configs from "./vite/configs";

export type DevOptions = {
  port: number;
  apiurl: string;
};

export default async function devServer(options: DevOptions) {
  process.env.QUIZMS_MODE = "development";

  const server = await createServer({
    ...configs("development"),
    publicDir: path.join(cwd(), "public"),
    server: options.apiurl
      ? {
          proxy: {
            "/api": {
              target: options.apiurl,
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/api/, ""),
            },
          },
        }
      : undefined,
  });
  await server.listen(options.port);

  server.printUrls();

  await new Promise(noop);
}
