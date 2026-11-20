import { describe, expect, it } from "vitest";

import type { CustomBlock } from "~/blockly-types";

import { BlocklyInterpreter } from "./interpreter";

type State = { position: number; log: string[] };

const block = (type: string, fn: CustomBlock<State>["fn"]): CustomBlock<State> => ({
  type,
  message0: type,
  colour: 0,
  tooltip: "",
  fn,
});

const customBlocks: CustomBlock<State>[] = [
  block("move", (_ctx, state, steps) => {
    state.position += steps as number;
  }),
  block("position", (_ctx, state) => state.position),
  block("finish", (ctx, state) => {
    if (state.position === 3) ctx.exit(true, "Bravo!");
    ctx.exit(false, `Wrong position ${state.position}`);
  }),
  block("wait", async (ctx, state) => {
    state.log.push("before pause");
    await ctx.pause();
    state.log.push("after pause");
  }),
];

const initialState: State = { position: 0, log: [] };

// As in the generated code, custom blocks receive their arguments in an array: `move([3])`.
const create = (code: string) => new BlocklyInterpreter(code, customBlocks, initialState);

/** Runs the program until it ends. */
async function run(interpreter: BlocklyInterpreter<State>) {
  for (let i = 0; i < 1000 && (await interpreter.step()); i++);
  return interpreter;
}

describe("BlocklyInterpreter", () => {
  it("runs one block per step", async () => {
    const interpreter = create(`
      highlightBlock("a"); move([2]);
      highlightBlock("b"); move([1]);
      highlightBlock("c"); finish([]);
    `);
    expect(interpreter.highlightedBlock).toBeUndefined();

    expect(await interpreter.step()).toBe(true);
    expect(interpreter.highlightedBlock).toBe("a");
    expect(interpreter.state.position).toBe(0);

    expect(await interpreter.step()).toBe(true);
    expect(interpreter.highlightedBlock).toBe("b");
    expect(interpreter.state.position).toBe(2);

    expect(await interpreter.step()).toBe(true);
    expect(interpreter.highlightedBlock).toBe("c");
    expect(interpreter.state.position).toBe(3);

    expect(await interpreter.step()).toBe(false);
    expect(interpreter.result).toEqual({ success: true, message: "Bravo!" });
  });

  it("does not modify the initial state", async () => {
    await run(create("move([5]);"));
    expect(initialState).toEqual({ position: 0, log: [] });
  });

  it("reports failures from custom blocks", async () => {
    const interpreter = await run(create("move([1]); finish([]);"));
    expect(interpreter.result).toEqual({ success: false, message: "Wrong position 1" });
  });

  it("fails if the program ends without completing the level", async () => {
    const interpreter = await run(create("move([3]);"));
    expect(interpreter.result).toEqual({
      success: false,
      message: "Il programma è terminato senza completare il livello",
    });
  });

  it("passes the values of output blocks to the program", async () => {
    const interpreter = await run(
      create("move([2]); var p = position([]); move([p - 1]); finish([]);"),
    );
    expect(interpreter.result?.success).toBe(true);
  });

  it("reports errors raised by the generated code", async () => {
    const interpreter = await run(create('error("Il blocco ha bisogno di un parametro");'));
    expect(interpreter.result).toEqual({
      success: false,
      message: "Il blocco ha bisogno di un parametro",
    });
  });

  it("reports JavaScript errors", async () => {
    const interpreter = await run(create("undefinedFunction();"));
    expect(interpreter.result?.success).toBe(false);
    expect(interpreter.result?.message).toContain("undefinedFunction");
  });

  it("stops infinite loops", async () => {
    const interpreter = await run(
      create('while (true) { if(--loopTrap === 0) error("Ciclo infinito"); }'),
    );
    expect(interpreter.result).toEqual({ success: false, message: "Ciclo infinito" });
  });

  it("does nothing after the end of the program", async () => {
    const interpreter = await run(create("finish([]);"));
    const result = interpreter.result;
    expect(await interpreter.step()).toBe(false);
    expect(interpreter.result).toBe(result);
  });

  it("stops a step when a block pauses, and resumes it in the next step", async () => {
    const interpreter = create('highlightBlock("a"); wait([]); move([3]); finish([]);');
    await interpreter.step();
    expect(interpreter.highlightedBlock).toBe("a");

    expect(await interpreter.step()).toBe(true);
    expect(interpreter.state.log).toEqual(["before pause"]);
    expect(interpreter.state.position).toBe(0);

    await run(interpreter);
    expect(interpreter.state.log).toEqual(["before pause", "after pause"]);
    expect(interpreter.result).toEqual({ success: true, message: "Bravo!" });
  });

  it("exposes the global variables of the program", async () => {
    const interpreter = create('var count = 2; var name = "x"; highlightBlock("a");');
    await interpreter.step();
    expect(interpreter.globalScope).toMatchObject({ count: 2, name: "x", loopTrap: 50_000 });
  });

  it("throws syntax errors when created", () => {
    expect(() => create("move([;")).toThrow(SyntaxError);
  });
});
