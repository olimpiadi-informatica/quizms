declare module "js-interpreter" {
  class Interpreter {
    constructor(code: string, initFn?: (interpreter: Interpreter, globalObject: any) => void);

    createNativeFunction(fn: (...args: any[]) => any): any;
    nativeToPseudo(value: any): any;
    setProperty(object: any, name: string, value: any): void;
    step(): boolean;
  }

  export default Interpreter;
}
