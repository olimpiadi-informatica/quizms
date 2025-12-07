import type { OutputBundle } from "rollup";
import type { PluginOption } from "vite";

import { fatal } from "~/utils-node";

export const externalLibs = [
  "@olinfo/quizms/components",
  "@olinfo/quizms/student",
  "@olinfo/quizms/models",
  "@olinfo/react-components",
  "lodash-es",
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
          if (req.url === devFile(lib)) {
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

export function getBuildImportMap(bundle: OutputBundle) {
  const imports = Object.fromEntries(
    externalLibs.map((lib) => {
      const chunk = Object.values(bundle)
        .filter((chunk) => chunk.type === "chunk")
        .find((chunk) => chunk.facadeModuleId === `\0virtual:quizms-assets-${lib}`);
      if (!chunk) fatal(`Missing chunk for ${lib}`);
      return [lib, `/${chunk.fileName}`];
    }),
  );
  return { imports };
}

export function getDevImportMap() {
  const imports = Object.fromEntries(externalLibs.map((lib) => [lib, devFile(lib)]));
  return { imports };
}

function devFile(id: string) {
  const fileName = id.replaceAll("/", "-").replaceAll(/[^\w-]/g, "");
  return `/statements-externals/${fileName}.js`;
}
