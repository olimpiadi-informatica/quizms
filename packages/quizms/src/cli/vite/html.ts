import type { Element, Root } from "hast";
import { isString } from "lodash-es";
import { rehype } from "rehype";
import type { OutputBundle, OutputChunk } from "rollup";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import type { HtmlTagDescriptor } from "vite";

import { warning } from "~/utils/logs";

const template = `\
<!DOCTYPE html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Caricamento...</title>
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>`;

export function generateHtml(...tags: HtmlTagDescriptor[]) {
  return rehype().use(applyTransform, tags).process(template).then(String);
}

const applyTransform: Plugin<[HtmlTagDescriptor[]], Root> = (tags) => {
  return (tree: Root) => {
    visit(tree, "element", (node) => {
      for (const tag of tags) {
        if (node.tagName === (tag.injectTo ?? "body")) {
          node.children.push(tagToHast(tag));
        }
        if (`${node.tagName}-prepend` === tag.injectTo) {
          node.children.unshift(tagToHast(tag));
        }
      }
    });
  };
};

function tagToHast(tag: HtmlTagDescriptor): Element {
  let children: Element["children"] = [];
  if (Array.isArray(tag.children)) {
    children = tag.children.map((child) => tagToHast(child));
  }
  if (isString(tag.children)) {
    children = [{ type: "text", value: tag.children }];
  }

  return {
    type: "element",
    tagName: tag.tag,
    properties: tag.attrs ?? {},
    children,
  };
}

export function generateHtmlFromBundle(
  entry: OutputChunk,
  bundle: OutputBundle,
  options?: {
    includeDynamicImports?: boolean;
  },
) {
  const modules = new Set<string>();
  const queue = [entry];

  while (queue.length > 0) {
    const chunk = queue.pop()!;
    const imports = [...chunk.imports];
    if (options?.includeDynamicImports) imports.push(...chunk.dynamicImports);
    for (const dep of imports) {
      if (modules.has(dep)) continue;
      modules.add(dep);
      queue.push(bundle[dep] as OutputChunk);
    }
    for (const css of chunk.viteMetadata?.importedCss ?? []) {
      modules.add(css);
    }
  }

  const tags: HtmlTagDescriptor[] = [
    {
      tag: "script",
      attrs: { type: "module", src: `/${entry.fileName}` },
      injectTo: "body",
    },
  ];

  for (const fileName of modules) {
    const chunk = bundle[fileName];

    // Vite will discard any empty chunk from the final bundle but apparently some of these chunks
    // are still present in the bundle of this hook. One of these chunks is a chunk which I think
    // is supposed to import CSS files. This is a workaround to avoid adding the links to the HTML.
    if ("moduleIds" in chunk && chunk.moduleIds.every((m) => m.endsWith(".css"))) {
      warning(`Ignoring empty chunk: ${chunk.fileName}`);
      continue;
    }

    tags.push({
      tag: "link",
      attrs: {
        rel: fileName.endsWith(".css") ? "stylesheet" : "modulepreload",
        href: `/${fileName}`,
      },
      injectTo: "head",
    });
  }

  return generateHtml(...tags);
}
