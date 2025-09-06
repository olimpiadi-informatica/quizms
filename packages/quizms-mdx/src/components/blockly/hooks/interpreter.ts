import Interpreter from "js-interpreter";

import type { Context, CustomBlock, TestcaseResult } from "~/blockly-types";

const MAX_LOOP_ITERATIONS = 1000;

class ExitError extends Error {
  constructor(
    public success: boolean,
    message: string,
  ) {
    super(message);
  }
}

export class BlocklyInterpreter<State> {
  private interpreter: Interpreter;
  private stepRunning = false;
  private hitPause: (() => void) | undefined;
  private resumePaused: (() => void) | undefined;
  private currentBlock: Promise<void> | undefined;

  public state: State;
  public highlightedBlock: string | undefined;
  public result: TestcaseResult | undefined;

  constructor(code: string, customBlocks: CustomBlock<State>[], initialState: State) {
    this.state = structuredClone(initialState);
    this.interpreter = new Interpreter(code, (interpreter: Interpreter, global: any) => {
      interpreter.setProperty(
        global,
        "highlightBlock",
        interpreter.createNativeFunction((id: string) => {
          this.highlightedBlock = id;
          this.stepRunning = false;
        }),
      );
      interpreter.setProperty(
        global,
        "error",
        interpreter.createNativeFunction((message: string) => {
          this.result = { success: false, message };
        }),
      );
      interpreter.setProperty(global, "loopTrap", MAX_LOOP_ITERATIONS);

      const ctx: Context = {
        exit: (success: boolean, msg: string) => {
          throw new ExitError(success, msg);
        },
        pause: async () => {
          this.stepRunning = false;
          this.hitPause?.();

          await new Promise<void>((resolve) => {
            this.resumePaused = resolve;
          });
        },
      };
      for (const block of customBlocks) {
        interpreter.setProperty(
          global,
          block.type,
          interpreter.createAsyncFunction((args: any, callback: (value: any) => void) => {
            this.currentBlock = Promise.resolve(
              block.fn(ctx, this.state, ...Array.from(args.properties)),
            ).then(callback);
          }),
        );
      }
    });
  }

  public step = async () => {
    if (this.result) return false;

    // Continue execution if paused by ctx.pause(). Note that since this function is synchronous,
    // the paused block is not yet executed, but is will be executed in the next await
    this.resumePaused?.();
    this.stepRunning = true;

    do {
      try {
        const pauseHit = new Promise<void>((resolve) => {
          this.hitPause = resolve;
        });

        // Run the next step, this will pause the interpreter if it hits a custom block
        if (!this.interpreter.step()) {
          this.result = {
            success: false,
            message: "Il programma è terminato senza completare il livello",
          };
        }
        if (this.interpreter.paused_) {
          await Promise.race([pauseHit, this.currentBlock]);
        }
      } catch (err) {
        this.result = {
          success: err instanceof ExitError ? err.success : false,
          message: (err as Error).message,
        };
      }
    } while (!this.result && this.stepRunning);

    return !this.result;
  };

  public get globalScope(): any {
    return this.interpreter.pseudoToNative(this.interpreter.globalScope.object);
  }
}
