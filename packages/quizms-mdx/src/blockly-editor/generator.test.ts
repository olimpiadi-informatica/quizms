import "blockly/blocks";

import { serialization, setLocale, Workspace, type WorkspaceSvg } from "blockly/core";
import { javascriptGenerator } from "blockly/javascript";
import * as enMessages from "blockly/msg/en";
import { describe, expect, it, vi } from "vitest";

import type { CustomBlockProcessed } from "~/blockly-types";

vi.spyOn(console, "info").mockImplementation(() => {});
// The built-in blocks need the messages, as in the editor.
setLocale(enMessages as unknown as Record<string, string>);
const { initGenerator, toJS } = await import("./generator");

// Custom blocks as produced by the `.blocks.yaml` loader.
const customBlocks = [
  {
    type: "start",
    message0: "start",
    nextStatement: null,
    colour: 20,
    tooltip: "",
    js: "",
    args0: [],
    inputsInline: true,
    helpUrl: "",
    fn: () => {},
  },
  {
    type: "move",
    message0: "move %1 %2",
    previousStatement: null,
    nextStatement: null,
    colour: 20,
    tooltip: "",
    js: "",
    args0: [
      { type: "input_value", name: "STEPS", check: "Number" },
      {
        type: "field_dropdown",
        name: "DIR",
        options: [
          ["left", "'left'"],
          ["right", "'right'"],
        ],
      },
    ],
    inputsInline: true,
    helpUrl: "",
    fn: () => {},
  },
  {
    type: "position",
    message0: "position",
    output: "Number",
    colour: 20,
    tooltip: "",
    js: "",
    args0: [],
    inputsInline: true,
    helpUrl: "",
    fn: () => 0,
  },
] as unknown as CustomBlockProcessed[];

/** Generates the code of a workspace with the given blocks below the start block. */
function generate(workspace: Workspace, next?: object) {
  workspace.clear();
  serialization.workspaces.load(
    { blocks: { languageVersion: 0, blocks: [{ type: "start", id: "start", next }] } },
    workspace,
  );
  return toJS(workspace as WorkspaceSvg);
}

const move = (id: string, steps: object | undefined, dir: string, next?: object) => ({
  block: {
    type: "move",
    id,
    fields: { DIR: dir },
    inputs: steps && { STEPS: { block: steps } },
    next,
  },
});

// The generator is a global singleton: the tests below share it and run in order.
describe("blockly generator", () => {
  const workspace = new Workspace();

  it("instruments the generated code", () => {
    expect(javascriptGenerator.STATEMENT_PREFIX).toBe("highlightBlock(%1);\n");
    expect(javascriptGenerator.INFINITE_LOOP_TRAP).toBe(
      'if(--loopTrap === 0) error("Ciclo infinito");\n',
    );
  });

  it("returns no code without a workspace", () => {
    expect(toJS(undefined)).toBe("");
  });

  it("generates calls to statement custom blocks", () => {
    initGenerator(workspace, customBlocks);

    const code = generate(
      workspace,
      move("m1", { type: "math_number", fields: { NUM: 3 } }, "'left'"),
    );
    expect(code).toBe(
      [
        "highlightBlock('start');",
        "start([]);",
        "highlightBlock('m1');",
        "move([3, 'left']);",
        "",
      ].join("\n"),
    );
  });

  it("generates calls to output custom blocks", () => {
    const code = generate(workspace, move("m1", { type: "position" }, "'right'"));
    expect(code).toContain("move([position([]), 'right']);");
  });

  it("reports missing inputs at run time", () => {
    const code = generate(workspace, move("m1", undefined, "'left'"));
    expect(code).toContain(`move([error("Il blocco ha bisogno di un parametro"), 'left']);`);
  });

  it("protects built-in blocks against infinite loops", () => {
    const code = generate(workspace, {
      block: {
        type: "controls_whileUntil",
        id: "loop",
        fields: { MODE: "WHILE" },
        inputs: { BOOL: { block: { type: "logic_boolean", fields: { BOOL: "TRUE" } } } },
      },
    });
    expect(code).toContain('while (true) {\n  if(--loopTrap === 0) error("Ciclo infinito");\n');
  });

  /** Generates the code that sets a variable with the given name. */
  function setVariable(name: string) {
    workspace.clear();
    serialization.workspaces.load(
      {
        blocks: {
          languageVersion: 0,
          blocks: [
            {
              type: "variables_set",
              id: "set",
              fields: { VAR: { id: "v1" } },
              inputs: { VALUE: { block: { type: "math_number", fields: { NUM: 1 } } } },
            },
          ],
        },
        variables: [{ name, id: "v1" }],
      },
      workspace,
    );
    return toJS(workspace as WorkspaceSvg);
  }

  it.each(["error", "highlightBlock", "loopTrap"])("renames variables named `%s`", (name) => {
    expect(setVariable(name)).toBe(`var ${name}2;\n\n\nhighlightBlock('set');\n${name}2 = 1;\n`);
  });

  it("renames variables named like a custom block", () => {
    expect(setVariable("move")).toContain("move2 = 1;");
  });

  it("rejects being initialized again with different custom blocks", () => {
    const other = new Workspace();
    initGenerator(other, customBlocks);
    expect(() =>
      initGenerator(other, [{ ...customBlocks[0], type: "jump" } as CustomBlockProcessed]),
    ).toThrow("javascriptGenerator was initialized multiple times with different custom blocks");
  });
});
