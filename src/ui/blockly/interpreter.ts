import Interpreter from "js-interpreter";

import { Input, Output } from "./io";

const MAX_LOOP_ITERATIONS = 1000;

export class BlocklyInterpreter extends Interpreter {
  private stepFinished = false;

  public highlightedBlock = "";
  public running = true;
  public output = "";

  constructor(code: string, input: string) {
    super(code, (interpreter: Interpreter, global: any) => {
      interpreter.setProperty(
        global,
        "highlightBlock",
        interpreter.createNativeFunction((id: string) => {
          this.highlightedBlock = id;
          this.stepFinished = true;
        }),
      );

      interpreter.setProperty(
        global,
        "exit",
        interpreter.createNativeFunction(() => (this.running = false)),
      );

      interpreter.setProperty(global, "input", interpreter.nativeToPseudo(new Input(input)));
      interpreter.setProperty(
        global,
        "output",
        interpreter.nativeToPseudo(new Output((value) => (this.output += value))),
      );
      interpreter.setProperty(global, "loopTrap", MAX_LOOP_ITERATIONS);
    });
  }

  public step = () => {
    if (!this.running) return false;

    do {
      this.stepFinished = false;
      try {
        this.running = super.step() && this.running;
      } catch (e) {
        this.output += `===== Errore ========\n${e}\n`;
        this.running = false;
      }
    } while (this.running && !this.stepFinished);

    if (!this.running) {
      this.output += "===== Terminato =====\n";
    }

    return this.running;
  };
}
