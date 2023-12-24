import { PluginOption } from "vite";

export default function preconnect(): PluginOption {
  return {
    name: "preconnect",
    transformIndexHtml() {
      if (!process.env.QUIZMS_TIME_SERVER) return;
      return [
        {
          tag: "link",
          attrs: {
            rel: "preconnect",
            href: process.env.QUIZMS_TIME_SERVER,
          },
          injectTo: "head",
        },
      ];
    },
  };
}
