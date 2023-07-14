import { Dispatch, SetStateAction, useEffect, useState } from "react";

import { WorkspaceSvg } from "blockly";
import { javascriptGenerator } from "blockly/javascript";
import Interpreter from "js-interpreter";

import { Input, Output } from "./io";

javascriptGenerator.STATEMENT_PREFIX = "highlightBlock(%1);\n";
javascriptGenerator.addReservedWords("highlightBlock");

class Executor {
  private readonly code: string;
  private readonly workspace: WorkspaceSvg;
  private readonly setOutput: Dispatch<SetStateAction<string>>;
  private readonly initInterpreter: (interpreter: Interpreter, globalObject: any) => void;
  private interpreter: Interpreter;
  private timerId: ReturnType<typeof setInterval> | undefined;
  private stepFinished = false;
  private exited = false;

  constructor(workspace: WorkspaceSvg, input: string, setOutput: Dispatch<SetStateAction<string>>) {
    this.code = javascriptGenerator.workspaceToCode(workspace);
    this.workspace = workspace;
    this.setOutput = setOutput;

    this.initInterpreter = (interpreter: Interpreter, globalObject: any) => {
      const highlightBlockWrapper = (id: string) => {
        workspace.highlightBlock(id);
        this.stepFinished = true;
      };

      interpreter.setProperty(
        globalObject,
        "highlightBlock",
        interpreter.createNativeFunction(highlightBlockWrapper)
      );

      interpreter.setProperty(globalObject, "input", interpreter.nativeToPseudo(new Input(input)));

      interpreter.setProperty(
        globalObject,
        "output",
        interpreter.nativeToPseudo(new Output(setOutput))
      );
    };

    this.interpreter = new Interpreter(this.code, this.initInterpreter);
  }

  public run = () => {
    if (this.exited) return;
    clearInterval(this.timerId);
    this.timerId = setInterval(this.step, 1000);
  };

  public runAll = () => {
    if (this.exited) return;
    clearInterval(this.timerId);
    this.timerId = setInterval(this.step, 10);
  };

  public step = () => {
    do {
      this.stepFinished = false;
      try {
        this.exited = !this.interpreter.step();
      } catch (e) {
        this.setOutput((prev) => `${prev}===== Errore ========\n${e}\n`);
        this.exited = true;
      }
    } while (!this.exited && !this.stepFinished);
    if (this.exited) {
      this.setOutput((prev) => `${prev}===== Terminato =====\n`);
      clearInterval(this.timerId);
    }
  };

  public pause = () => {
    clearInterval(this.timerId);
  };

  public reset = () => {
    this.interpreter = new Interpreter(this.code, this.initInterpreter);
    this.setOutput("");
    this.stepFinished = false;
    this.exited = false;
    this.workspace.highlightBlock(null);
  };
}

export default function useExecutor(
  workspace: WorkspaceSvg | undefined,
  input: string
): [Executor | undefined, string] {
  const [output, setOutput] = useState("");
  const [executor, setExecutor] = useState<Executor>();

  useEffect(() => {
    if (workspace) {
      setExecutor((prev) => {
        prev?.reset();
        return new Executor(workspace, input, setOutput);
      });
    }
  }, [workspace, input]);

  return [executor, output];
}
