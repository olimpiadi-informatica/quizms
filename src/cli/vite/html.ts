import { Element, Root } from "hast";
import { isString } from "lodash-es";
import { rehype } from "rehype";
import rehypeFormat from "rehype-format";
import { OutputBundle, OutputChunk } from "rollup";
import { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { HtmlTagDescriptor } from "vite";

const template = `\
<!DOCTYPE html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <title>QuizMS</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="" />
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>`;

export function generateHtml(...tags: HtmlTagDescriptor[]) {
  return rehype().use(applyTransform, tags).use(rehypeFormat).process(template).then(String);
}

const applyTransform: Plugin<[HtmlTagDescriptor[]], Root> = (tags) => {
  return (tree: Root) => {
    visit(tree, "element", (node) => {
      for (const tag of tags) {
        if (node.tagName === (tag.injectTo ?? "body")) {
          node.children.push(tagToHast(tag));
        }
        if (node.tagName + "-prepend" === tag.injectTo) {
          node.children.unshift(tagToHast(tag));
        }
      }
    });
  };
};

function tagToHast(tag: HtmlTagDescriptor): Element {
  let children: Element["children"] = [];
  if (Array.isArray(tag.children)) {
    children = tag.children.map(tagToHast);
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
  options?: { includeDynamicImports: boolean },
) {
  const modules = new Set<string>();
  const queue = [entry];

  while (queue.length) {
    const chunk = queue.pop()!;
    const imports = [...chunk.imports];
    if (options?.includeDynamicImports) imports.push(...chunk.dynamicImports);
    for (const dep of chunk.imports) {
      if (modules.has(dep)) continue;
      modules.add(dep);
      queue.push(bundle[dep] as OutputChunk);
    }
    for (const css of chunk.viteMetadata?.importedCss ?? []) {
      modules.add(css);
    }
  }

  const tags: HtmlTagDescriptor[] = [];
  for (const fileName of modules) {
    tags.push({
      tag: "link",
      attrs: {
        rel: fileName.endsWith(".css") ? "stylesheet" : "modulepreload",
        href: "/" + fileName,
      },
      injectTo: "head",
    });
  }

  tags.push({
    tag: "script",
    attrs: { type: "module", src: `/${entry.fileName}` },
    injectTo: "body",
  });

  if (process.env.QUIZMS_TIME_SERVER) {
    tags.push({
      tag: "link",
      attrs: {
        rel: "preconnect",
        href: process.env.QUIZMS_TIME_SERVER,
      },
      injectTo: "head",
    });
  }

  return generateHtml(...tags);
}
