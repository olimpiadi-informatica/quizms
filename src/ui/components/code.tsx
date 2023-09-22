import React, { ReactNode } from "react";

import { HLJSApi, Language } from "highlight.js";
import { createLowlight } from "lowlight";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";

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
        begin: /[←→+\-×/…=≠≤≥]/,
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

const lowlight = createLowlight({ srs });
const astGenerator = {
  highlight: (lang: string, value: string) => {
    const result = lowlight.highlight(lang, value);
    return {
      language: result.data?.language || null,
      value: result.children,
    };
  },
  highlightAuto: () => {},
  listLanguages: () => lowlight.listLanguages(),
};

type Props = {
  code: string;
  inline?: boolean;
  language: string;
};

export default function Code({ inline, ...props }: Props) {
  return inline ? <InlineCode {...props} /> : <BlockCode {...props} />;
}

function InlineCode({ code, language }: Omit<Props, "inline">) {
  return (
    <SyntaxHighlighter
      language={language}
      PreTag={({ children }) => children}
      useInlineStyles={false}
      astGenerator={astGenerator}>
      {code}
    </SyntaxHighlighter>
  );
}

function BlockCode({ code, language }: Omit<Props, "inline">) {
  return (
    <SyntaxHighlighter
      language={language}
      wrapLines={true}
      showLineNumbers={true}
      useInlineStyles={false}
      astGenerator={astGenerator}>
      {code}
    </SyntaxHighlighter>
  );
}
