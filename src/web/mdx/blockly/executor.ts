import { useCallback, useEffect, useState } from "react";

import { BlocklyInterpreter } from "./interpreter";

type StateType = {
  highlightedBlock: string;
  running: boolean;
  correct: boolean;
  msg: string;
  globalScope: Record<string, any>;
};

export default function useExecutor(code: string, initialState: Record<string, any>) {
  const [interpreter, setInterpreter] = useState<BlocklyInterpreter>();

  const [state, setState] = useState<StateType>({
    highlightedBlock: "",
    running: true,
    correct: false,
    msg: "",
    globalScope: {},
  });

  const reset = useCallback(() => {
    let interpreter: BlocklyInterpreter;
    try {
      interpreter = new BlocklyInterpreter(code, initialState);
    } catch (err) {
      if (err instanceof SyntaxError && "loc" in err) {
        const lines = code.split("\n");
        const { line, column } = err.loc as { line: number; column: number };

        const padding = String(lines.length + 1).length;

        const prefix = lines
          .slice(0, line)
          .map((l, i) => ` ${String(i + 1).padStart(padding)} | ${l}`)
          .slice(-3)
          .join("\n");
        const suffix = lines
          .slice(line)
          .map((l, i) => ` ${String(line + i + 1).padStart(padding)} | ${l}`)
          .slice(0, 3)
          .join("\n");

        console.info(`\
Error: ${err.message}
${prefix}
 ${" ".repeat(padding)} | ${" ".repeat(column)}^
${suffix}`);
      }

      throw err;
    }
    setInterpreter(interpreter);
    setState({
      highlightedBlock: interpreter?.highlightedBlock ?? "",
      running: interpreter?.running ?? false,
      correct: interpreter?.correct ?? false,
      msg: interpreter?.msg ?? "",
      globalScope: interpreter?.pseudoToNative(interpreter.globalScope.object) ?? {},
    });
  }, [code, initialState]);

  useEffect(() => reset(), [reset]);

  const step = () => {
    interpreter?.step();
    setState({
      highlightedBlock: interpreter?.highlightedBlock ?? "",
      running: interpreter?.running ?? false,
      correct: interpreter?.correct ?? false,
      msg: interpreter?.msg ?? "",
      globalScope: interpreter?.pseudoToNative(interpreter.globalScope.object) ?? {},
    });
  };

  return {
    step,
    reset,
    ...state,
  };
}
