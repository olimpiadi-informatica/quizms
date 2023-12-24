import React, { Suspense } from "react";
import { lazy } from "react";

import classNames from "classnames";

const CodeHighlight = lazy(() => import("./codeHighlight"));

type Props = {
  code: string;
  inline?: boolean;
  noLineNumbers?: boolean;
  language: string;
};

export default function Code(props: Props) {
  return (
    <Suspense fallback={<CodeFallback {...props} />}>
      <CodeHighlight {...props} />
    </Suspense>
  );
}

function CodeFallback({ inline, code, noLineNumbers }: Props) {
  if (inline) {
    return <code>{code}</code>;
  }
  return (
    <pre>
      <code>
        {code.split("\n").map((line, i) => (
          <span key={i}>
            <span
              className={classNames(
                "mr-5 inline-block w-7 pr-0.5 text-right",
                noLineNumbers && "hidden",
              )}>
              {i + 1}
            </span>
            <span>{line}</span>
          </span>
        ))}
      </code>
    </pre>
  );
}
