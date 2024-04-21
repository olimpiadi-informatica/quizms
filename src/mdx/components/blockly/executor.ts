import { useCallback, useEffect, useState } from "react";

import { BlocklyInterpreter } from "./interpreter";

type StateType = {
  highlightedBlock: string;
  running: boolean;
  correct: boolean;
  pauseRequired: number;
  msg: string;
  globalScope: Record<string, any>;
};

export default function useExecutor(code: string, initialState: Record<string, any>) {
  const [interpreter, setInterpreter] = useState<BlocklyInterpreter>();

  const [state, setState] = useState<StateType>({
    highlightedBlock: "",
    running: true,
    correct: false,
    pauseRequired: 0,
    msg: "",
    globalScope: {},
  });

  const reset = useCallback(() => {
    const interpreter = new BlocklyInterpreter(code, initialState);
    setInterpreter(interpreter);
    setState({
      highlightedBlock: interpreter?.highlightedBlock ?? "",
      running: interpreter?.running ?? false,
      correct: interpreter?.correct ?? false,
      msg: interpreter?.msg ?? "",
      globalScope: interpreter?.pseudoToNative(interpreter.globalScope.object) ?? {},
      pauseRequired: interpreter?.pauseRequired ?? 0,
    });
  }, [code, initialState]);

  useEffect(() => {
    reset();
  }, [reset, code, initialState]);

  const step = () => {
    interpreter?.step();
    setState({
      highlightedBlock: interpreter?.highlightedBlock ?? "",
      running: interpreter?.running ?? false,
      correct: interpreter?.correct ?? false,
      msg: interpreter?.msg ?? "",
      globalScope: interpreter?.pseudoToNative(interpreter.globalScope.object) ?? {},
      pauseRequired: interpreter?.pauseRequired ?? 0,
    });
  };

  return {
    step,
    reset,
    ...state,
  };
}
