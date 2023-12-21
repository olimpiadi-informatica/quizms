import { readFile } from "node:fs/promises";
import { join } from "node:path";

import yaml from "js-yaml";
import { camelCase, cloneDeepWith, isPlainObject } from "lodash-es";
import Papa from "papaparse";
import * as toml from "smol-toml";
import { ZodType } from "zod";

import validate from "~/utils/validate";

import { fatal, info } from "./logs";

export async function readCollection<T>(collection: string, schema: ZodType<T, any, any>) {
  const parsers = [
    { ext: ".toml", parser: toml.parse },
    { ext: ".yaml", parser: yaml.load },
    { ext: ".json", parser: JSON.parse },
    { ext: ".jsonl", parser: parseJsonl },
    { ext: ".csv", parser: parseCsv },
  ];

  const path = join("data", collection); // TODO: option dir
  for (const { ext, parser } of parsers) {
    let content: string;
    try {
      content = await readFile(path + ext, "utf-8");
    } catch (e) {
      continue;
    }
    info(`Reading from ${path}${ext}...`);

    let rawData: any;
    try {
      rawData = parser(content);
    } catch (e) {
      fatal(`Cannot parse ${path}${ext}: ${e}`);
    }

    try {
      if (Array.isArray(rawData)) {
        return validate(schema.array(), renameKeys(rawData));
      } else if (isPlainObject(rawData)) {
        return Object.entries(rawData).map(([id, record]) => {
          if (!isPlainObject(record)) {
            fatal(`Cannot parse ${path}${ext}: ${id} is not an object`);
          }
          return validate(schema, renameKeys({ id, ...(record as object) }));
        });
      } else {
        fatal(`Cannot parse ${path}${ext}: not an array or object`);
      }
    } catch (e) {
      fatal(`Cannot parse ${path}${ext}: ${e}`);
    }
  }

  fatal(`Cannot find ${collection} file.`);
}

function parseJsonl(content: string) {
  const lines = content.split("\n");
  return lines.map((line) => JSON.parse(line));
}

function parseCsv(content: string) {
  const result = Papa.parse(content, { header: true });
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
