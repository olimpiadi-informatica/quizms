import React, { Suspense, lazy } from "react";

import classNames from "classnames";

const CodeHighlight = lazy(() => import("./code-highlight"));

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
                "mr-6 inline-block w-7 select-none text-right",
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
