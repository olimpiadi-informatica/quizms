import React, { useMemo } from "react";

import classNames from "classnames";
import { RootContent } from "hast";
import { HLJSApi, Language } from "highlight.js";
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

const languages = { srs };
const lowlight = createLowlight(languages);

type Props = {
  code: string;
  inline?: boolean;
  noLineNumbers?: boolean;
  language: string;
};

export default function Code({ inline, ...props }: Props) {
  return inline ? <InlineCode {...props} /> : <BlockCode {...props} />;
}

function InlineCode(props: Omit<Props, "inline">) {
  return <BaseCode {...props} noLineNumbers />;
}

type Token = {
  className?: string;
  value: string;
};

function BlockCode(props: Omit<Props, "inline">) {
  return (
    <pre>
      <BaseCode {...props} />
    </pre>
  );
}

function BaseCode({ code, language, noLineNumbers }: Omit<Props, "inline">) {
  const children = useMemo(() => {
    if (!language) return code;
    const hast = lowlight.highlight(language, code);

    const lines: Token[][] = [[]];

    for (const node of hast.children) {
      processNode(node);
    }

    return lines.map((line, i) => (
      <span key={i}>
        <span
          className={classNames(
            "mr-6 inline-block w-7 select-none text-right",
            noLineNumbers && "hidden",
          )}>
          {i + 1}
        </span>
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
        lines[lines.length - 1].push({ className, value: lastLine });
        for (const newLine of newLines) {
          lines.push([{ className, value: newLine }]);
        }
      } else {
        throw new Error(`Unexpected node: ${node.type}`);
      }
    }
  }, [code, language, noLineNumbers]);

  return <code>{children}</code>;
}
