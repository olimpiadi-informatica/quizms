import { cwd } from "node:process";

export function serverStatementFile() {
  return `\
import { createWriteStream } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { register } from "node:module";

import { createElement } from "react";
import { renderToPipeableStream } from "react-server-dom-webpack/server";

register("./loader.js", import.meta.url);
register("react-server-dom-webpack/node-loader", import.meta.url);

const { default: Statement } = await import(\`./\${process.env.QUIZMS_CONTEST_ID}.mjs\`);

const manifest = JSON.parse(await readFile("manifest.json", "utf-8"));
const { pipe } = renderToPipeableStream(createElement(Statement), manifest);

const statementPath = path.join(
  "${cwd()}",
  "variants",
  process.env.QUIZMS_CONTEST_ID,
  process.env.QUIZMS_VARIANT_ID,
  "statement.txt",
);
pipe(createWriteStream(statementPath));`;
}

export function serverSchemaFile() {
  return `\
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { parseRawSchema } from "@olinfo/quizms-mdx/schema";

const { default: Statement } = await import(\`./\${process.env.QUIZMS_CONTEST_ID}.mjs\`);

const html = renderToStaticMarkup(createElement(Statement));
console.log(JSON.stringify(parseRawSchema(html)));
`;
}

export function loaderFile() {
  return `\
export async function load(url, context, nextLoad) {
  const result = await nextLoad(url, context);
  if (Buffer.isBuffer(result.source)) {
    result.source = result.source.toString("utf-8");
  }
  return result;
}`;
}
