import { describe, expect, expectTypeOf, it } from "vitest";

import { type BlocklyType, type Context, type CustomBlock, defineBlocks } from "./index";

type State = { position: number };

describe("defineBlocks", () => {
  it("returns the blocks unchanged", () => {
    const blocks = defineBlocks<State>()([
      {
        type: "move",
        message0: "move by %1",
        colour: 20,
        tooltip: "Moves",
        fn: (_ctx, state, steps: number) => {
          state.position += steps;
        },
      },
      {
        type: "position",
        message0: "position",
        colour: 20,
        tooltip: "Position",
        fn: (_ctx, state) => state.position,
      },
    ]);
    expect(blocks.map((block) => block.type)).toEqual(["move", "position"]);

    const state = { position: 1 };
    blocks[0].fn({} as Context, state, 2);
    expect(state.position).toBe(3);
  });

  it("checks the placeholders of the message", () => {
    expectTypeOf<CustomBlock<State, [number, string]>["message0"]>().toExtend<string>();
    expectTypeOf<"go %1 to %2">().toExtend<CustomBlock<State, [number, string]>["message0"]>();
    expectTypeOf<"go %1">().not.toExtend<CustomBlock<State, [number, string]>["message0"]>();
  });

  it("restricts the values returned by blocks", () => {
    expectTypeOf<ReturnType<CustomBlock<State>["fn"]>>().toExtend<
      BlocklyType | void | Promise<BlocklyType | void>
    >();
  });
});
