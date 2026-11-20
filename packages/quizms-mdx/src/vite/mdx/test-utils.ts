// Helpers shared by the tests of the MDX plugins (not part of the package).

import { type CompileOptions, compile } from "@mdx-js/mdx";
import { VFile } from "vfile";

/** Path of the compiled file: the plugins use the name of the problem folder (`p-1-test`). */
export const testFilePath = "/contest/p-1-test/question.md";

/** Compiles an MDX source and returns the generated JavaScript (with JSX, to keep it readable). */
export async function compileMdx(
  source: string,
  options: CompileOptions = {},
  path = testFilePath,
): Promise<string> {
  const file = await compile(new VFile({ path, value: source }), {
    format: "mdx",
    jsx: true,
    ...options,
  });
  return String(file);
}

/**
 * Compiles an MDX source and returns the JSX returned by `_createMdxContent`, formatted with one
 * tag or text node per line. `_components.` prefixes and newline-only text nodes are removed.
 */
export async function compileToJsx(source: string, options: CompileOptions = {}): Promise<string> {
  const code = await compileMdx(source, options);
  const match = /^ {2}return (.*);$/m.exec(code);
  if (!match) throw new Error(`Cannot find the return statement in:\n${code}`);
  return formatJsx(match[1].replaceAll("_components.", ""));
}

function formatJsx(jsx: string): string {
  const lines: string[] = [];
  let indent = 0;
  let text = "";

  const push = (line: string) => lines.push("  ".repeat(indent) + line);
  const flush = () => {
    if (text.trim() && text.trim() !== '{"\\n"}') push(text.trim());
    text = "";
  };

  let i = 0;
  while (i < jsx.length) {
    if (jsx[i] === "{") {
      const end = skipExpression(jsx, i);
      text += jsx.slice(i, end);
      i = end;
    } else if (jsx[i] === "<") {
      flush();
      let j = i + 1;
      while (jsx[j] !== ">") j = jsx[j] === "{" ? skipExpression(jsx, j) : j + 1;
      const tag = jsx.slice(i, j + 1);
      if (tag.startsWith("</")) indent--;
      push(tag);
      if (!tag.startsWith("</") && !tag.endsWith("/>")) indent++;
      i = j + 1;
    } else {
      text += jsx[i++];
    }
  }
  flush();
  return lines.join("\n");
}

/** Returns the index after the braced JavaScript expression that starts at `start`. */
function skipExpression(code: string, start: number): number {
  const stack: string[] = [];
  let i = start;
  do {
    const c = code[i];
    const top = stack.at(-1);
    if (top === '"' || top === "'") {
      if (c === "\\") i++;
      else if (c === top) stack.pop();
    } else if (top === "`") {
      if (c === "\\") i++;
      else if (c === "`") stack.pop();
      else if (c === "$" && code[i + 1] === "{") {
        stack.push("{");
        i++;
      }
    } else if (c === "{") {
      stack.push("{");
    } else if (c === "}") {
      stack.pop();
    } else if (c === '"' || c === "'" || c === "`") {
      stack.push(c);
    }
    i++;
  } while (stack.length > 0 && i < code.length);
  return i;
}
