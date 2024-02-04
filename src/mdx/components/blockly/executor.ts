import { useEffect, useState } from "react";

import type { BlocklyInterpreter } from "./interpreter";

type StateType = {
  highlightedBlock: string;
  running: boolean;
  globalScope: Record<string, any>;
};

export default function useExecutor(code: string, initialState: Record<string, any>) {
  const [interpreter, setInterpreter] = useState<BlocklyInterpreter>();

  const [state, setState] = useState<StateType>({
    highlightedBlock: "",
    running: true,
    globalScope: {},
  });

  const reset = () => {
    import("./interpreter").then(({ BlocklyInterpreter }) => {
      const interpreter = new BlocklyInterpreter(code, initialState);
      setInterpreter(interpreter);
    });
    setState({
      highlightedBlock: "",
      running: true,
      globalScope: interpreter?.pseudoToNative(interpreter.globalScope.object) ?? {},
    });
  };

  useEffect(() => {
    reset();
  }, [code, initialState]);

  const step = () => {
    interpreter?.step();
    setState({
      highlightedBlock: interpreter?.highlightedBlock ?? "",
      running: interpreter?.running ?? true,
      globalScope: interpreter?.pseudoToNative(interpreter.globalScope.object) ?? {},
    });
  };

  return [step, reset, state.running, state.highlightedBlock, state.globalScope] as const;
}
