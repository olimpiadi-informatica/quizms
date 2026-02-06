import { readFile } from "node:fs/promises";
import path from "node:path";
import { cwd } from "node:process";

import { camelCase, cloneDeepWith, isPlainObject } from "lodash-es";
import Papa from "papaparse";
import * as toml from "smol-toml";
import yaml from "yaml";
import z from "zod";

import { contestSchema, variantsConfigSchema } from "~/models";
import { validate } from "~/utils";

import { fatal } from "./logs";

const parsers: { ext: string; parser: (str: string) => any }[] = [
  { ext: ".toml", parser: toml.parse },
  { ext: ".yaml", parser: yaml.parse },
  { ext: ".json", parser: JSON.parse },
  { ext: ".jsonl", parser: parseJsonl },
  { ext: ".csv", parser: parseCsv },
];

const cache = new Map<string, Promise<string | null>>();

function readFileCached(fileName: string) {
  if (!cache.has(fileName)) {
    cache.set(
      fileName,
      readFile(fileName, "utf8").catch(() => null),
    );
  }
  return cache.get(fileName)!;
}

export async function load<T>(collection: string, schema: z.core.$ZodType<T>) {
  const fileName = path.join("data", collection);

  for (const { ext, parser } of parsers) {
    const relativePath = path.relative(cwd(), collection) + ext;

    const content = await readFileCached(fileName + ext);
    if (content == null) continue;

    let rawData: any;
    try {
      rawData = parser(content);
    } catch (err) {
      fatal(`Cannot parse ${relativePath}: ${err}`);
    }

    try {
      if (Array.isArray(rawData)) {
        return validate(z.array(schema), renameKeys(rawData));
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

export async function loadContests() {
  const contests = await load("contests", contestSchema);
  const variantConfigs = await load("variants", variantsConfigSchema);

  return contests.map((contest) => {
    const config = variantConfigs.find((c) => c.id === contest.id);
    if (!config) {
      fatal(`Missing variants configuration for contest ${contest.id}.`);
    }
    return { ...contest, ...config };
  });
}
