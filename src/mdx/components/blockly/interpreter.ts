import Interpreter from "js-interpreter";

const MAX_LOOP_ITERATIONS = 1000;

export class BlocklyInterpreter extends Interpreter {
  private stepFinished = false;

  public highlightedBlock = "";
  public running = true;
  public correct = false;
  public msg = "";
  public output = "";

  constructor(code: string, initialState: Record<string, any>) {
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
        interpreter.createNativeFunction((correct: boolean, msg: string) => {
          this.running = false;
          this.correct = correct;
          this.msg = msg;
        }),
      );
      interpreter.setProperty(global, "hiddenState", interpreter.nativeToPseudo(initialState));

      interpreter.setProperty(global, "loopTrap", MAX_LOOP_ITERATIONS);
    });
  }

  public step = () => {
    if (!this.running) return false;

    do {
      this.stepFinished = false;
      try {
        this.running = super.step() && this.running;
      } catch {
        this.running = false;
      }
    } while (this.running && !this.stepFinished);

    return this.running;
  };
}
