import { Dispatch, SetStateAction, useEffect, useState } from "react";

import { WorkspaceSvg } from "blockly";
import { javascriptGenerator } from "blockly/javascript";
import Interpreter from "js-interpreter";

import { Input, Output } from "./io";

javascriptGenerator.STATEMENT_PREFIX = "highlightBlock(%1);\n";
javascriptGenerator.INFINITE_LOOP_TRAP = 'if(--loopTrap == 0) throw "Ciclo infinito";\n';
javascriptGenerator.addReservedWords("highlightBlock,loopTrap");

class Executor {
  private readonly workspace: WorkspaceSvg;
  private readonly setOutput: Dispatch<SetStateAction<string>>;
  private readonly setExited: Dispatch<SetStateAction<boolean>>;
  private code: string;
  private input: string;
  private interpreter: Interpreter;
  private timerId: ReturnType<typeof setInterval> | undefined;
  private stepFinished = false;
  private started = false;
  private exited = false;

  private readonly MAX_OUTPUT_LENGTH = 2000;
  private readonly MAX_OUTPUT_LINES = 100;
  private readonly MAX_LOOP_ITERATIONS = 1000;

  private initInterpreter = () => (interpreter: Interpreter, globalObject: any) => {
    interpreter.setProperty(
      globalObject,
      "highlightBlock",
      interpreter.createNativeFunction((id: string) => {
        this.workspace.highlightBlock(id);
        this.stepFinished = true;
      }),
    );

    interpreter.setProperty(globalObject, "loopTrap", this.MAX_LOOP_ITERATIONS);

    interpreter.setProperty(
      globalObject,
      "exit",
      interpreter.createNativeFunction(() => {
        this.exited = true;
      }),
    );

    interpreter.setProperty(
      globalObject,
      "input",
      interpreter.nativeToPseudo(new Input(this.input)),
    );

    interpreter.setProperty(
      globalObject,
      "output",
      interpreter.nativeToPseudo(new Output(this.setOutput)),
    );
  };

  constructor(
    workspace: WorkspaceSvg,
    initialInput: string,
    setOutput: Dispatch<SetStateAction<string>>,
    setExited: Dispatch<SetStateAction<boolean>>,
  ) {
    this.workspace = workspace;
    this.setOutput = setOutput;
    this.setExited = setExited;

    this.code = javascriptGenerator.workspaceToCode(workspace);
    this.input = initialInput;
    this.interpreter = new Interpreter(this.code, this.initInterpreter());
  }

  public setCode = (code: string) => {
    if (this.code !== code) {
      this.code = code;
      this.reset();
    }
  };

  public setInput = (input: string) => {
    this.input = input;
    if (!this.started) this.reset();
  };

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
    if (this.exited) return;
    this.started = true;
    do {
      this.stepFinished = false;
      try {
        this.exited = !this.interpreter.step() || this.exited;

        let length = 0;
        let lines = 0;
        this.setOutput((prev) => {
          length = prev.length;
          if (length > this.MAX_OUTPUT_LENGTH) {
            return prev.slice(0, this.MAX_OUTPUT_LENGTH) + "...\n";
          }
          lines = prev.split("\n").length;
          if (lines > this.MAX_OUTPUT_LINES) {
            return prev.split("\n").slice(0, this.MAX_OUTPUT_LINES).join("\n") + "\n";
          }
          return prev;
        });

        if (length > this.MAX_OUTPUT_LENGTH || lines > this.MAX_OUTPUT_LINES) {
          throw "L'output è troppo lungo";
        }
      } catch (e) {
        this.setOutput((prev) => `${prev}===== Errore ========\n${e}\n`);
        this.exited = true;
      }
    } while (!this.exited && !this.stepFinished);
    if (this.exited) {
      this.setOutput((prev) => `${prev}===== Terminato =====\n`);
      clearInterval(this.timerId);
      this.setExited(true);
    }
  };

  public pause = () => {
    if (this.exited) return;
    clearInterval(this.timerId);
  };

  public reset = () => {
    clearInterval(this.timerId);
    this.interpreter = new Interpreter(this.code, this.initInterpreter());
    this.setOutput("");
    this.stepFinished = false;
    this.started = false;
    this.exited = false;
    this.setExited(false);
    this.workspace.highlightBlock(null);
  };
}

export default function useExecutor(workspace: WorkspaceSvg | undefined, initialInput: string) {
  const [output, setOutput] = useState("");
  const [executor, setExecutor] = useState<Executor>();
  const [exited, setExited] = useState(false);

  useEffect(() => {
    if (workspace) {
      setExecutor((prev) => {
        prev?.reset();
        return new Executor(workspace, initialInput, setOutput, setExited);
      });
    }
  }, [workspace, initialInput]);

  return [executor, output, exited] as const;
}
