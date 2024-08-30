import { useCallback, useEffect, useState } from "react";

import { FrameError } from "~/web/components";
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
      if (err instanceof SyntaxError) {
        const file = URL.createObjectURL(new Blob([code]));
        const line = (err as any).loc.line;
        const col = (err as any).loc.column + 1;
        throw new FrameError(
          `The generated code contains syntax errors: ${err.message}`,
          { file, line, col },
          err,
        );
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
