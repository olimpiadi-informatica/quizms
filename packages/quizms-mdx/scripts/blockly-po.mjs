// Blockly's messages as gettext catalogs: `locales/blockly/<locale>.po`.
//
// Each entry has the Blockly key as `msgctxt` (e.g. `CONTROLS_IF_MSG_IF`) and the English text as
// `msgid`. Run `node scripts/blockly-po.mjs` after upgrading Blockly to add the new messages (taken
// from Blockly's own translations when it has them) and to mark the changed ones as fuzzy; run it
// with `--check` to fail if the catalogs are out of date or incomplete.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parsePoFile } from "@lingui/format-po";

const require = createRequire(import.meta.url);

export const localesDir = path.resolve(fileURLToPath(import.meta.url), "../../locales/blockly");

/** Keep in sync with `locales` in `lingui.config.ts`; the first one is the source language. */
export const locales = ["en", "it"];

/** Messages of QuizMS used inside Blockly (toolbox categories, errors of the generated code). */
const quizmsMessages = {
  QUIZMS_CATEGORY_VARIABLES: { en: "Variables", it: "Variabili" },
  QUIZMS_CATEGORY_MATH: { en: "Math", it: "Matematica" },
  QUIZMS_CATEGORY_LOGIC: { en: "Logic", it: "Logica" },
  QUIZMS_CATEGORY_LOOPS: { en: "Loops", it: "Cicli" },
  QUIZMS_CATEGORY_LISTS: { en: "Lists", it: "Liste" },
  QUIZMS_CATEGORY_CUSTOM: { en: "Execution", it: "Esecuzione" },
  QUIZMS_INFINITE_LOOP: { en: "Infinite loop", it: "Ciclo infinito" },
  QUIZMS_MISSING_PARAMETER: {
    en: "The block needs a parameter",
    it: "Il blocco ha bisogno di un parametro",
  },
};

/** Blockly's own messages of a locale (`{}` if Blockly doesn't have the locale). */
function blocklyMessages(locale) {
  try {
    return require(`blockly/msg/${locale}`);
  } catch {
    return {};
  }
}

/** Colours are configuration, not text: they are not translated. */
const isTranslatable = (key) => !key.endsWith("_HUE");

/** The source (English) messages, in a stable order. */
function sourceMessages() {
  const messages = {};
  for (const [key, value] of Object.entries(blocklyMessages(locales[0]))) {
    if (isTranslatable(key)) messages[key] = value;
  }
  for (const [key, value] of Object.entries(quizmsMessages)) {
    messages[key] = value[locales[0]];
  }
  return messages;
}

/** Reads a catalog: Blockly key → `{ msgid, msgstr, fuzzy }`. */
export function readCatalog(file) {
  const catalog = new Map();
  for (const item of parsePoFile(readFileSync(file, "utf8")).items) {
    if (item.obsolete || !item.msgctxt) continue;
    catalog.set(item.msgctxt, {
      msgid: item.msgid,
      msgstr: item.msgstr[0] ?? "",
      fuzzy: Boolean(item.flags?.fuzzy),
    });
  }
  return catalog;
}

function quote(value) {
  const escaped = value
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\n", "\\n")
    .replaceAll("\t", "\\t");
  return `"${escaped}"`;
}

/** The content of the catalog of `locale`, updated with the current Blockly messages. */
function updatedCatalog(locale) {
  const file = path.join(localesDir, `${locale}.po`);
  const existing = existsSync(file) ? readCatalog(file) : new Map();
  const isSource = locale === locales[0];
  const blockly = blocklyMessages(locale);

  const lines = [
    'msgid ""',
    'msgstr ""',
    '"Content-Type: text/plain; charset=utf-8\\n"',
    `"Language: ${locale}\\n"`,
    '"X-Generator: quizms-mdx/scripts/blockly-po.mjs\\n"',
    "",
  ];
  for (const [key, msgid] of Object.entries(sourceMessages())) {
    let msgstr = "";
    let fuzzy = false;
    if (!isSource) {
      const old = existing.get(key);
      if (old) {
        msgstr = old.msgstr;
        // The English text changed: the translation must be checked.
        fuzzy = old.fuzzy || (old.msgid !== msgid && msgstr !== "");
      } else {
        msgstr = quizmsMessages[key]?.[locale] ?? blockly[key] ?? "";
      }
    }
    if (fuzzy) lines.push("#, fuzzy");
    lines.push(`msgctxt ${quote(key)}`, `msgid ${quote(msgid)}`, `msgstr ${quote(msgstr)}`, "");
  }
  return { file, content: lines.join("\n") };
}

/**
 * The messages to pass to Blockly's `setLocale` for the catalog `file`: Blockly's English messages
 * (including the colours), replaced by the source catalog and then by the translations.
 *
 * @returns the messages and the keys that are not translated (empty or fuzzy).
 */
export function compileCatalog(file) {
  const locale = path.basename(file, ".po");
  const messages = { ...blocklyMessages(locales[0]) };
  for (const [key, { msgid }] of readCatalog(path.join(path.dirname(file), `${locales[0]}.po`))) {
    messages[key] = msgid;
  }
  const missing = [];
  if (locale !== locales[0]) {
    for (const [key, { msgstr, fuzzy }] of readCatalog(file)) {
      if (msgstr && !fuzzy) messages[key] = msgstr;
      else missing.push(key);
    }
  }
  return { messages, missing };
}

function main() {
  const check = process.argv.includes("--check");
  mkdirSync(localesDir, { recursive: true });
  let failed = false;

  for (const locale of locales) {
    const { file, content } = updatedCatalog(locale);
    const relative = path.relative(process.cwd(), file);
    const current = existsSync(file) ? readFileSync(file, "utf8") : undefined;
    if (current !== content) {
      if (check) {
        console.error(`${relative} is out of date: run \`pnpm blockly:po\` in quizms-mdx.`);
        failed = true;
        continue;
      }
      writeFileSync(file, content);
      console.info(`Updated ${relative}`);
    }

    const { missing } = compileCatalog(file);
    if (missing.length > 0) {
      console.error(`${relative}: ${missing.length} untranslated or fuzzy: ${missing.join(", ")}`);
      failed ||= check;
    }
  }

  if (failed) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
