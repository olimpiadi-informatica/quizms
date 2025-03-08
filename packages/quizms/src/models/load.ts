import { readFile } from "node:fs/promises";
import path from "node:path";
import { cwd } from "node:process";

import { camelCase, cloneDeepWith, isPlainObject } from "lodash-es";
import Papa from "papaparse";
import * as toml from "smol-toml";
import yaml from "yaml";
import type { ZodType } from "zod";

import { fatal, info } from "~/utils/logs";
import validate from "~/utils/validate";

const parsers: { ext: string; parser: (str: string) => any }[] = [
  { ext: ".toml", parser: toml.parse },
  { ext: ".yaml", parser: yaml.parse },
  { ext: ".json", parser: JSON.parse },
  { ext: ".jsonl", parser: parseJsonl },
  { ext: ".csv", parser: parseCsv },
];

export default async function load<T>(collection: string, schema: ZodType<T, any, any>) {
  const fileName = path.join("data", collection);

  for (const { ext, parser } of parsers) {
    const relativePath = path.relative(cwd(), collection) + ext;

    let content: string;
    try {
      content = await readFile(fileName + ext, "utf8");
    } catch {
      continue;
    }
    info(`Reading from ${fileName + ext}`);

    let rawData: any;
    try {
      rawData = parser(content);
    } catch (err) {
      fatal(`Cannot parse ${relativePath}: ${err}`);
    }

    try {
      if (Array.isArray(rawData)) {
        return validate(schema.array(), renameKeys(rawData));
      }
      if (isPlainObject(rawData)) {
        return Object.entries(rawData).map(([id, record]) => {
          if (!isPlainObject(record)) {
            fatal(`Cannot parse ${relativePath}: ${id} is not an object`);
          }
          return validate(schema, renameKeys({ id, ...(record as object) }));
        });
      }
      fatal(`Cannot parse ${relativePath}: not an array or object`);
    } catch (err) {
      fatal(`Cannot parse ${relativePath}: ${err}`);
    }
  }

  fatal(`Cannot find ${collection} file.`);
}

function parseJsonl(content: string) {
  return content
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function parseCsv(content: string) {
  const result = Papa.parse(content, { header: true, skipEmptyLines: true });
  if (result.errors.length > 0) {
    throw new Error(result.errors[0].message);
  }
  return result.data;
}

function renameKeys(value: any): any {
  return cloneDeepWith(value, (v) => {
    if (isPlainObject(v)) {
      return Object.fromEntries(Object.entries(v).map(([k, v]) => [camelCase(k), renameKeys(v)]));
    }
  });
}
