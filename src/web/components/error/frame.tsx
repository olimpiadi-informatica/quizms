import { Fragment } from "react";

import clsx from "clsx";
import { type StackFrameLite, parse as parseStack } from "error-stack-parser-es/lite";
import { FileCode } from "lucide-react";
import { SourceMapConsumer } from "source-map-js";
import useSWR from "swr";

import style from "./error.module.css";
import { FrameError } from "./index";

export default function FrameCode({ error }: { error: Error }) {
  const frame = error instanceof FrameError ? error.frame : parseStack(error)[0];

  const { data } = useSWR(frameKey(frame), ([file, line, column]) => fetcher(file, line, column), {
    suspense: true,
  });

  if (!data) return;

  const { source, line, column, code } = data;

  const lines = code.split("\n");
  const padding = String(lines.length + 1).length;

  const prefix = lines
    .slice(0, line)
    .map<[number, string]>((l, i) => [i + 1, l])
    .slice(-5);
  const suffix = lines
    .slice(line)
    .map<[number, string]>((l, i) => [line + i + 1, l])
    .slice(0, 5);

  return (
    <div className={style.code}>
      <div className="flex gap-2 text-base-content/60 pb-2 pt-3 pl-4">
        <FileCode size={16} />
        <a href={frame.file} target="_blank" rel="noreferrer">
          {source}:{line}:{column}
        </a>
      </div>
      <div className={style.codeGrid}>
        {prefix.map(([i, l]) => (
          <Fragment key={i}>
            <div className={style.lineNumber}>{String(i).padStart(padding)}</div>
            <div>{l}</div>
          </Fragment>
        ))}
        <div className={style.lineNumber}>{" ".repeat(padding)}</div>
        <div className={clsx(style.line, "select-none")}>{" ".repeat(column - 1)}^</div>
        {suffix.map(([i, l]) => (
          <Fragment key={i}>
            <div className={style.lineNumber}>{String(i).padStart(padding)}</div>
            <div>{l}</div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function frameKey(frame: StackFrameLite): [string, number, number] | undefined {
  if (!frame.file || !frame.line || !frame.col) return;
  return [frame.file, frame.line, frame.col];
}

async function fetcher(
  source: string,
  line: number,
  column: number,
): Promise<{ source: string; line: number; column: number; code: string }> {
  try {
    const url = new URL(source);
    url.pathname += ".map";

    const resp = await fetch(url.href);
    const rawSourceMap = await resp.json();
    const sourceMap = new SourceMapConsumer(rawSourceMap);

    const position = sourceMap.originalPositionFor({ line, column });
    const code = sourceMap.sourceContentFor(position.source);
    return { ...position, code };
  } catch {
    const resp = await fetch(source);
    const code = await resp.text();
    return { source: new URL(source).pathname, line, column, code };
  }
}
