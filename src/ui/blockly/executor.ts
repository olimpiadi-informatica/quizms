import { useEffect, useState } from "react";

import type { BlocklyInterpreter } from "./interpreter";

export default function useExecutor(code: string, input: string) {
  const [interpreter, setInterpreter] = useState<BlocklyInterpreter>();

  useEffect(() => {
    import("./interpreter").then(({ BlocklyInterpreter }) => {
      const interpreter = new BlocklyInterpreter(code, input);
      setInterpreter(interpreter);
    });
  }, []);

  const [state, setState] = useState({
    output: "",
    highlightedBlock: "",
    running: true,
  });

  const step = () => {
    interpreter?.step();
    setState({
      output: interpreter?.output ?? "",
      highlightedBlock: interpreter?.highlightedBlock ?? "",
      running: interpreter?.running ?? true,
    });
  };

  return [step, state.output, state.running, state.highlightedBlock] as const;
}
