import { useCallback, useEffect, useState } from "react";

import type { CustomBlock, TestcaseResult } from "~/blockly-types";

import { BlocklyInterpreter } from "./interpreter";

export function useExecutor<State>(
  code: string,
  customBlocks: CustomBlock<State>[],
  initialState: State,
  variableMappings: object,
  highlightBlock: (id: string | undefined) => void,
) {
  const [interpreter, setInterpreter] = useState<BlocklyInterpreter<State>>();
  const [state, setState] = useState<State>(initialState);
  const [result, setResult] = useState<TestcaseResult | undefined>(undefined);
  const [variables, setVariables] = useState<object>({});

  const updateVariables = useCallback(
    (interpreter: BlocklyInterpreter<State>) => {
      const globalScope = interpreter.globalScope ?? {};
      setVariables(
        Object.fromEntries(Object.entries(variableMappings).map(([k, v]) => [v, globalScope[k]])),
      );
    },
    [variableMappings],
  );

  const reset = useCallback(() => {
    let interpreter: BlocklyInterpreter<State>;
    try {
      interpreter = new BlocklyInterpreter(code, customBlocks, initialState);
    } catch (err) {
      if (err instanceof SyntaxError) {
        const file = URL.createObjectURL(new Blob([code]));
        const line = (err as any).loc.line;
        const col = (err as any).loc.column + 1;

        const resolvedError = new Error(
          `The generated code contains syntax errors: ${err.message}`,
          { cause: err },
        );
        resolvedError.stack = `   at ${file}:${line}:${col}`;
        throw resolvedError;
      }
      throw err;
    }
    setInterpreter(interpreter);
    setState(interpreter.state);
    setResult(interpreter.result);
    highlightBlock(interpreter.highlightedBlock);
    updateVariables(interpreter);
  }, [code, customBlocks, initialState, highlightBlock, updateVariables]);

  useEffect(() => reset(), [reset]);

  const step = useCallback(async () => {
    if (!interpreter) return;

    await interpreter.step();
    setState({ ...interpreter.state });
    setResult(interpreter.result && { ...interpreter.result });
    highlightBlock(interpreter.highlightedBlock);
    updateVariables(interpreter);
  }, [interpreter, highlightBlock, updateVariables]);

  return { step, reset, state, result, variables };
}
