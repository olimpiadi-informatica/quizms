import { Suspense, lazy } from "react";

const CodeHighlight = lazy(() => import("./code-highlight"));

type Props = {
  code: string;
  inline?: boolean;
  language: string;
};

export default function Code({ language, ...props }: Props) {
  if (!language || language === "text") {
    return <PlainCode {...props} />;
  }

  return (
    <Suspense fallback={<PlainCode {...props} />}>
      <CodeHighlight language={language} {...props} />
    </Suspense>
  );
}

function PlainCode({ code, inline }: { code: string; inline?: boolean }) {
  if (inline) return code;

  return (
    <pre>
      <code>
        {code.split("\n").map((line, i) => (
          <span key={i}>
            <span>{line}</span>
          </span>
        ))}
      </code>
    </pre>
  );
}
