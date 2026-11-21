import { describe, expect, it } from "vitest";

import { defaultInitialBlocks, defaultToolbox } from "./defaults";

const categoryNames = (language: string | undefined) =>
  defaultToolbox(language).contents.map((category) => ("name" in category ? category.name : ""));

describe("defaultToolbox", () => {
  it("uses Italian names in single-language contests", () => {
    expect(categoryNames(undefined)).toEqual([
      "Variabili",
      "Matematica",
      "Logica",
      "Cicli",
      "Liste",
    ]);
  });

  it("translates the category names", () => {
    expect(categoryNames("it")).toEqual(categoryNames(undefined));
    expect(categoryNames("en")).toEqual(["Variables", "Math", "Logic", "Loops", "Lists"]);
  });

  it("falls back to English for other languages", () => {
    expect(categoryNames("de")).toEqual(categoryNames("en"));
  });

  it("has the same blocks in every language", () => {
    const withoutNames = (language: string | undefined) =>
      defaultToolbox(language).contents.map((category) => ({ ...category, name: undefined }));
    expect(withoutNames("en")).toEqual(withoutNames("it"));
  });

  it("contains the built-in categories", () => {
    const toolbox = defaultToolbox("en");
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
    expect(defaultToolbox("en")).not.toBe(defaultToolbox("en"));
    expect(defaultToolbox("en").contents).not.toBe(defaultToolbox("en").contents);
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
