import { useEffect, useState } from "react";

import type { BlocklyInterpreter } from "./interpreter";

export default function useExecutor(code: string, input: string) {
  const [interpreter, setInterpreter] = useState<BlocklyInterpreter>();

  const [state, setState] = useState({
    output: "",
    highlightedBlock: "",
    running: true,
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
    });
  };

  return [step, reset, state.output, state.running, state.highlightedBlock] as const;
}
