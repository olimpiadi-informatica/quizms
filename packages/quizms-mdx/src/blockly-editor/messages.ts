import { resolveUiLocale, type UiLocale } from "@olinfo/quizms/i18n";
import { setLocale } from "blockly/core";

import { setGeneratorMessages } from "./generator";

/** Blockly's messages, translated in `locales/blockly/<locale>.po` (see `scripts/blockly-po.mjs`). */
const catalogs: Record<UiLocale, () => Promise<{ default: Record<string, string> }>> = {
  en: () => import("../../locales/blockly/en.po?blockly"),
  it: () => import("../../locales/blockly/it.po?blockly"),
};

/**
 * Sets Blockly's messages (blocks, menus, toolbox categories, errors of the generated code) in the
 * statement language. Like the rest of the UI, single-language contests are in Italian and
 * languages without a translation use English.
 *
 * Must happen before creating the workspace: blocks read the messages when they are created.
 */
export async function setBlocklyLanguage(language: string | undefined) {
  const { default: messages } = await catalogs[resolveUiLocale(language)]();
  setLocale(messages);
  setGeneratorMessages();
}
