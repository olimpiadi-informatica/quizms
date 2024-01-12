import { noop } from "lodash-es";

import { Input, Output } from "./io";

class ExitError extends Error {}

function exit() {
  throw new ExitError();
}

export default function fastExecutor(code: string, textInput: string) {
  let textOutput = "";

  const input = new Input(textInput);
  const output = new Output((value) => (textOutput += value));

  try {
    const fn = new Function("input", "output", "highlightBlock", "loopTrap", "exit", code);
    fn(input, output, noop, 10_000_000, exit);
  } catch (e) {
    if (!(e instanceof ExitError)) {
      textOutput += (e as Error).message;
    }
  }

  return textOutput;
}
