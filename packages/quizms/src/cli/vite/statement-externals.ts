import type { PluginOption } from "vite";

export const externalLibs = [
  "@olinfo/quizms/components",
  "@olinfo/quizms/student",
  "@olinfo/react-components",
  "react",
  "react/jsx-runtime",
];

export function statementExternals(): PluginOption {
  let isBuild = false;

  return {
    name: "quizms:statement-externals",
    configResolved(config) {
      isBuild = config.command === "build";
    },
    buildStart() {
      if (isBuild) {
        for (const lib of externalLibs) {
          this.emitFile({
            type: "chunk",
            id: `virtual:quizms-assets-${lib}`,
            fileName: outputFile(lib),
            preserveSignature: "strict",
          });
        }
      }
    },
    resolveId(id) {
      if (id.startsWith("virtual:quizms-assets-")) {
        return `\0${id}`;
      }
    },
    load(id) {
      if (id.startsWith("\0virtual:quizms-assets-")) {
        const lib = id.replace("\0virtual:quizms-assets-", "");
        switch (lib) {
          case "react":
            return `export { Children, Component, Fragment, Profiler, PureComponent, StrictMode, Suspense, cache, cloneElement, createContext, createElement, createRef, forwardRef, isValidElement, lazy, memo, startTransition, use, useActionState, useCallback, useContext, useDebugValue, useDeferredValue, useEffect, useId, useImperativeHandle, useInsertionEffect, useLayoutEffect, useMemo, useOptimistic, useReducer, useRef, useState, useSyncExternalStore, useTransition } from "react";`;
          case "react/jsx-runtime":
            return `export { Fragment, jsx, jsxs } from "react/jsx-runtime";`;
          default:
            return `export * from "${lib}";`;
        }
      }
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) {
          next();
          return;
        }

        for (const lib of externalLibs) {
          if (req.url === `/${outputFile(lib)}`) {
            const module = await server.transformRequest(`virtual:quizms-assets-${lib}`);

            res.setHeader("Content-Type", "application/javascript");
            res.end(module?.code);
            return;
          }
        }

        next();
      });
    },
  };
}

export function getImportMap() {
  const imports = Object.fromEntries(externalLibs.map((lib) => [lib, `/${outputFile(lib)}`]));
  return { imports };
}

function outputFile(id: string) {
  const fileName = id.replaceAll("/", "-").replaceAll(/[^\w-]/g, "");
  return `assets/_lib/${fileName}.js`;
}
