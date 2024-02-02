import { useEffect, useState } from "react";

import type { BlocklyInterpreter } from "./interpreter";

type StateType = {
  output: string;
  highlightedBlock: string;
  running: boolean;
  variables: Record<string, any>;
};

export default function useExecutor(code: string, input: string) {
  const [interpreter, setInterpreter] = useState<BlocklyInterpreter>();

  const [state, setState] = useState<StateType>({
    output: "",
    highlightedBlock: "",
    running: true,
    variables: {},
  });

  const reset = () => {
    import("./interpreter").then(({ BlocklyInterpreter }) => {
      const interpreter = new BlocklyInterpreter(code, input);
      setInterpreter(interpreter);
    });
    setState({
      output: "",
      highlightedBlock: "",
      running: true,
      variables: interpreter?.globalScope.object.properties ?? {},
    });
  };

  useEffect(() => {
    reset();
  }, [code, input]);

  const step = () => {
    interpreter?.step();
    setState({
      output: interpreter?.output ?? "",
      highlightedBlock: interpreter?.highlightedBlock ?? "",
      running: interpreter?.running ?? true,
      variables: { ...interpreter?.globalScope.object.properties } ?? {},
    });
  };

  return [
    step,
    reset,
    state.output,
    state.running,
    state.highlightedBlock,
    state.variables,
  ] as const;
}
