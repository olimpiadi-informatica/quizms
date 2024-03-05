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
  return props.inline ? <InlineCode {...props} /> : <BlockCode {...props} />;
}

function InlineCode(props: Omit<Props, "inline">) {
  return (
    <code className="bg-transparent px-0.5">
      <BaseCode {...props} noLineNumbers />
    </code>
  );
}

function BlockCode({ noLineNumbers, ...props }: Omit<Props, "inline">) {
  return (
    <pre className="bg-base-200 text-base-content print:px-0">
      <code
        className={classNames(
          "block *:block *:min-w-fit *:rounded hover:*:bg-base-300 print:*:whitespace-pre-wrap",
          "[counter-reset:line] *:before:content-[counter(line)] *:before:[counter-increment:line]",
          "*:before:mr-6 *:before:inline-block *:before:w-7 *:before:text-right",
          noLineNumbers && "*:before:hidden",
        )}>
        <BaseCode {...props} />
      </code>
    </pre>
  );
}

function BaseCode({ language, ...props }: Omit<Props, "inline">) {
  if (!language || language === "text") {
    return <PlainCode {...props} />;
  }

  return (
    <Suspense fallback={<PlainCode {...props} />}>
      <CodeHighlight language={language} {...props} />
    </Suspense>
  );
}

function PlainCode({ code }: Pick<Props, "code">) {
  return code.split("\n").map((line, i) => (
    <span key={i}>
      <span>{line}</span>
    </span>
  ));
}
