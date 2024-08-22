declare module "@blockly/disable-top-blocks" {
  export const DisableTopBlocks: any;
}

declare module "js-interpreter" {
  export default class Interpreter {
    constructor(code: string, initFn?: (interpreter: Interpreter, globalObject: any) => void);

    createNativeFunction(fn: (...args: any[]) => any): any;

    nativeToPseudo(value: any): any;

    pseudoToNative(value: any): any;

    setProperty(object: any, name: string, value: any): void;

    step(): boolean;

    globalScope: { object: { properties: Record<string, any> } };
  }
}

declare module "*.rules" {
  const path: string;
  export default path;
}

declare module "virtual:quizms-contests" {
  import type { GenerationConfig } from "~/models/generation-config";

  export default function contests(): GenerationConfig[];
}
