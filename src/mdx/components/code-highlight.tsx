import React from "react";

import { HLJSApi, Language } from "highlight.js";
import { createLowlight } from "lowlight";
import SyntaxHighlighterBuilder from "react-syntax-highlighter/dist/esm/highlight";

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
const SyntaxHighlighter = SyntaxHighlighterBuilder(
  {
    highlight: (lang: string, value: string) => {
      const result = lowlight.highlight(lang, value);
      return {
        language: result.data?.language || null,
        value: result.children,
      };
    },
    highlightAuto: () => {
      throw new Error("Not implemented");
    },
    listLanguages: () => lowlight.listLanguages(),
  },
  {},
);

type Props = {
  code: string;
  inline?: boolean;
  noLineNumbers?: boolean;
  language: string;
};

export default function Code({ inline, ...props }: Props) {
  return inline ? <InlineCode {...props} /> : <BlockCode {...props} />;
}

function InlineCode({ code, language }: Omit<Props, "inline">) {
  return (
    <SyntaxHighlighter
      language={language in languages ? language : "text"}
      PreTag={({ children }) => <>{children}</>}
      useInlineStyles={false}>
      {code}
    </SyntaxHighlighter>
  );
}

function BlockCode({ code, language, noLineNumbers }: Omit<Props, "inline">) {
  return (
    <SyntaxHighlighter
      language={language in languages ? language : "text"}
      wrapLines={true}
      showLineNumbers={!noLineNumbers}
      useInlineStyles={false}>
      {code}
    </SyntaxHighlighter>
  );
}
