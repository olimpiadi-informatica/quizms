import type { PluginOption } from "vite";

export default function restEntry(): PluginOption {
  return {
    name: "quizms:rest-entry",
    api: {
      quizmsDevRoutes: [
        {
          pathname: /^\/rest\/admin(\/[^/]+(\/schools)?)?$/,
          module: "@olinfo/quizms-rest/entry",
        },
        {
          pathname: /^\/rest\/teacher(\/[^/]+(\/students(\/[^/]+)?)?)?$/,
          module: "@olinfo/quizms-rest/entry",
        },
        {
          pathname: "/rest",
          module: "@olinfo/quizms-rest/entry",
        },
      ],
    },
    config() {
      return {
        server: {
          proxy: {
            "/api": {
              target: "http://0.0.0.0:3000",
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/api/, ""),
            },
          },
        },
      };
    },
  } satisfies PluginOption;
}
