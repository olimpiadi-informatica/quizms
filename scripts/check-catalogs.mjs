// Fails if a message has different translations in the catalogs of two packages.
//
// All the catalogs of a locale are loaded into the same Lingui instance, and a message's id
// depends only on its text (and context): the translation loaded last would win.
import { existsSync, readdirSync, readFileSync } from "node:fs";

import { parsePoFile } from "@lingui/format-po";

const files = readdirSync("packages")
  .map((pkg) => `packages/${pkg}/locales`)
  .filter((dir) => existsSync(dir))
  .flatMap((dir) =>
    readdirSync(dir)
      .filter((name) => name.endsWith(".po"))
      .map((name) => `${dir}/${name}`),
  );
const seen = new Map();
let conflicts = 0;

for (const file of files.sort()) {
  const locale = file.split("/").pop().replace(/\.po$/, "");
  for (const item of parsePoFile(readFileSync(file, "utf8")).items) {
    if (item.obsolete || !item.msgid) continue;
    const key = `${locale}\u0000${item.msgctxt ?? ""}\u0000${item.msgid}`;
    const msgstr = item.msgstr[0] ?? "";
    const previous = seen.get(key);
    if (previous && previous.msgstr !== msgstr) {
      console.error(
        `"${item.msgid}" (${locale}) is translated differently in ${previous.file} ("${previous.msgstr}") and ${file} ("${msgstr}"): use the same translation or a different text or context.`,
      );
      conflicts++;
    } else if (!previous) {
      seen.set(key, { file, msgstr });
    }
  }
}

if (conflicts > 0) process.exit(1);
