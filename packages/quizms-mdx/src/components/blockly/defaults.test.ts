import { describe, expect, it } from "vitest";

import enMessages from "../../../locales/blockly/en.po?blockly";
import itMessages from "../../../locales/blockly/it.po?blockly";
import { defaultInitialBlocks, defaultToolbox } from "./defaults";

const categoryNames = () =>
  defaultToolbox().contents.map((category) => ("name" in category ? category.name : ""));

/** Resolves `%{BKY_KEY}` references like Blockly does. */
const resolve = (messages: Record<string, string>, name: string) =>
  name.replace(/%\{BKY_(\w+)\}/g, (_, key: string) => messages[key] ?? `<missing ${key}>`);

describe("defaultToolbox", () => {
  it("names the categories with Blockly messages", () => {
    expect(categoryNames().map((name) => resolve(itMessages, name))).toEqual([
      "Variabili",
      "Matematica",
      "Logica",
      "Cicli",
      "Liste",
    ]);
    expect(categoryNames().map((name) => resolve(enMessages, name))).toEqual([
      "Variables",
      "Math",
      "Logic",
      "Loops",
      "Lists",
    ]);
  });

  it("contains the built-in categories", () => {
    const toolbox = defaultToolbox();
    expect(toolbox.kind).toBe("categoryToolbox");
    expect(toolbox.contents).toMatchObject([
      { kind: "category", categorystyle: "variable_category", custom: "VARIABLE" },
      { kind: "category", categorystyle: "math_category" },
      { kind: "category", categorystyle: "logic_category" },
      { kind: "category", categorystyle: "loop_category" },
      { kind: "category", categorystyle: "list_category" },
    ]);
  });

  it("returns a new toolbox every time", () => {
    // The editor adds the custom blocks category to the toolbox it receives.
    expect(defaultToolbox()).not.toBe(defaultToolbox());
    expect(defaultToolbox().contents).not.toBe(defaultToolbox().contents);
  });
});

describe("defaultInitialBlocks", () => {
  it("contains only the start block", () => {
    expect(defaultInitialBlocks).toEqual({
      blocks: {
        languageVersion: 0,
        blocks: [{ type: "start", id: "start", x: 30, y: 30 }],
      },
      variables: [],
    });
  });
});
