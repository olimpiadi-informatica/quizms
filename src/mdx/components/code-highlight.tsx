import { useMemo } from "react";

import classNames from "classnames";
import { getHighlighter } from "shiki";

import srs from "./srs";

type Props = {
  code: string;
  language: string;
  inline?: boolean;
};

const highlighter = await getHighlighter({
  themes: ["github-light", "github-dark"],
  langs: [srs],
});

export default function CodeHighlight({ code, language, inline }: Props) {
  const html = useMemo(() => {
    return highlighter.codeToHtml(code, {
      lang: language,
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      structure: inline ? "inline" : "classic",
    });
  }, [code, language, inline]);

  return (
    <span
      dangerouslySetInnerHTML={{ __html: html }}
      className={classNames(inline && "shiki font-mono text-sm")}
    />
  );
}
