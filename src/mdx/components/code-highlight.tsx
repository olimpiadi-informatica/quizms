import React, { useMemo } from "react";

import classNames from "classnames";
import { RootContent, Text } from "hast";
import { HLJSApi, Language, LanguageFn } from "highlight.js";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import xml from "highlight.js/lib/languages/xml";
import { createLowlight } from "lowlight";

function srs(hljs: HLJSApi): Language {
  return {
    name: "Pseudocode",
    aliases: ["srs"],
    keywords: "variable function return end if then else for in while do",
    contains: [
      hljs.QUOTE_STRING_MODE,
      {
        scope: "type",
        begin: /(integer)(\[])*/,
      },
      {
        scope: "number",
        begin: /-?\b\d+\b/,
      },
      {
        scope: "operator",
        begin: /[<>]|\b(mod|and|or|not)\b/,
      },
      {
        scope: "operator.small",
        begin: /[+/=×…←→≠≤≥-]/,
      },
      {
        scope: "built_in",
        begin: /\b(output|max|min)\b/,
      },
      {
        scope: "title.function",
        begin: /(?<=function\s+)\w+(?=\()/,
      },
      {
        scope: "title.function.invoke",
        begin: /\w+(?=\()/,
      },
      {
        scope: "meta.missing",
        begin: /\[\?+]/,
      },
    ],
  };
}

const languages: Record<string, LanguageFn> = import.meta.env.DEV
  ? { srs, json, javascript, xml }
  : { srs };
const lowlight = createLowlight(languages);

type Props = {
  code: string;
  language: string;
};

type Token = {
  className?: string;
  value: string;
};

export default function CodeHighlight({ code, language }: Props) {
  return useMemo(() => {
    const hast =
      !language || language === "text"
        ? { type: "root", children: [{ type: "text", value: code } as Text] }
        : lowlight.highlight(language, code);

    const lines: Token[][] = [[]];
    for (const node of hast.children) {
      processNode(node);
    }

    return lines.map((line, i) => (
      <span key={i}>
        {line.map((token, j) => (
          <span key={j} className={token.className}>
            {token.value}
          </span>
        ))}
      </span>
    ));

    function processNode(node: RootContent, className?: string) {
      if (node.type === "element") {
        if (node.tagName !== "span") throw new Error(`Unexpected element: ${node.tagName}`);
        for (const child of node.children) {
          processNode(child, classNames(className, node.properties?.className));
        }
      } else if (node.type === "text") {
        const [lastLine, ...newLines] = node.value.split("\n");
        lines.at(-1)!.push({ className, value: lastLine });
        for (const newLine of newLines) {
          lines.push([{ className, value: newLine }]);
        }
      } else {
        throw new Error(`Unexpected node: ${node.type}`);
      }
    }
  }, [code, language]);
}
